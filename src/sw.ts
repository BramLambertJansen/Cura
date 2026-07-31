/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";

/**
 * Cura service worker (vite-plugin-pwa `injectManifest`).
 *
 * Four jobs:
 *  1. Offline precache (Workbox) — what generateSW did before the switch.
 *  2. The SPA navigation fallback — also something generateSW used to give us
 *     for free (see below); without it the app can't start offline.
 *  3. The 'prompt' update flow — activate a waiting worker ONLY when the app
 *     posts SKIP_WAITING (never unconditionally: that would silently become
 *     autoUpdate and reload mid-task, the opposite of calm — see vite.config.ts
 *     and useAppUpdate).
 *  4. Web Push — show a wekker notification when the app is closed, or hand it
 *     to a visible tab (which shows an in-app toast via useTaskReminders) so the
 *     user never gets both an OS notification and an in-app one for one wekker.
 */

// vite-plugin-pwa's injectManifest replaces the LITERAL token `self.__WB_MANIFEST`
// in the built worker, so it must appear verbatim (not via an alias). Augment
// the global scope to type it, and cast a separate handle for the ServiceWorker-
// specific API (skipWaiting/clients/registration + the typed event map).
declare global {
  interface WorkerGlobalScope {
    __WB_MANIFEST: (string | { url: string; revision: string | null })[];
  }
}

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

/**
 * SPA navigation fallback — serve the precached index.html for every navigation,
 * so a deep route (/vandaag, /huis/:id, /boodschappen, …) resolves from cache
 * instead of hitting the network for a URL that only exists as a Vercel rewrite.
 *
 * This is NOT optional polish: without it the app cannot start offline anywhere
 * except "/". The precache route only matches real files, so every other route
 * fell through to the network and a phone on no/flaky mobile data got the
 * browser's network-error page instead of Cura. `generateSW` injected this
 * automatically (its `navigateFallback` default is 'index.html'); moving to a
 * hand-written `injectManifest` worker for push silently dropped it — so if this
 * worker is ever rewritten, this route has to come along.
 *
 * `denylist`: /api and anything with a file extension keep going to the network,
 * so a future server route can never be swallowed by the app shell.
 */
registerRoute(
  new NavigationRoute(createHandlerBoundToURL("index.html"), {
    denylist: [/^\/api\//, /\/[^/?]+\.[^/]+$/],
  }),
);

const sw = self as unknown as ServiceWorkerGlobalScope;

// registerType:'prompt' — wait for the user's explicit "Vernieuwen" tap, which
// workbox-window (useAppUpdate) turns into this SKIP_WAITING message. Without
// this listener the in-app update toast would hang forever.
//
// No origin/source check here: postMessage to a service worker is only
// reachable from a same-origin page in the first place (there is no cross-
// origin postMessage path to a SW registration), so this assumes same-origin
// by construction, not by omission — worth calling out explicitly since
// there's no runtime check backing that assumption (#170).
sw.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") void sw.skipWaiting();
});

// Without this, a newly-activated SW doesn't take control of an already-open
// tab until that tab's next hard navigation/reload — so "Vernieuwen" (which
// relies on the resulting `controllerchange` to actually reload) would
// silently do nothing for a tab left open across the update (#192).
sw.addEventListener("activate", (event) => {
  event.waitUntil(sw.clients.claim());
});

interface ReminderPayload {
  title: string;
  body?: string;
  firedForKey: string;
  /** Deep-link target so a wekker tap opens the task (see useTaskDeepLink). */
  taskId?: string;
  url?: string;
}

function parsePayload(event: PushEvent): ReminderPayload | null {
  if (!event.data) return null;
  try {
    const data = event.data.json() as Partial<ReminderPayload>;
    if (typeof data.title !== "string" || typeof data.firedForKey !== "string") return null;
    return { title: data.title, body: data.body, firedForKey: data.firedForKey, taskId: data.taskId, url: data.url };
  } catch {
    return null;
  }
}

sw.addEventListener("push", (event) => {
  const payload = parsePayload(event);
  if (!payload) return;
  event.waitUntil(
    (async () => {
      const clients = (await sw.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      })) as readonly WindowClient[];
      const visible = clients.find((c) => c.visibilityState === "visible");
      if (visible) {
        // App is on screen — let the in-app channel handle it. useTaskReminders
        // dedups against its own poll by firedForKey, so no double notification.
        visible.postMessage({ type: "cura-reminder", title: payload.title, firedForKey: payload.firedForKey, taskId: payload.taskId });
        return;
      }
      await sw.registration.showNotification(`Tijd voor: ${payload.title}`, {
        body: payload.body ?? "Je hebt dit op de planning staan.",
        // tag = firedForKey: coalesces with an in-app Notification of the same
        // wekker (e.g. a throttled background tab that still polled) into one.
        tag: payload.firedForKey,
        // Geen `icon`: als geïnstalleerde WebAPK toont Android het Cura-app-icoon al
        // links op de melding — een grote huisje-afbeelding rechts zou datzelfde
        // beeld dubbel tonen. De monochrome `badge` hieronder hoort bij dat app-icoon.
        // badge = de kleine monochrome status-/taakbalk-icoon; Android tint 'm via
        // het alfakanaal, dus een apart wit huis-silhouet i.p.v. het volkleuren-icoon
        // (dat als een witte blok zou renderen).
        badge: "/icons/badge-96.png",
        data: { url: payload.url ?? "/", taskId: payload.taskId },
      });
    })(),
  );
});

sw.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data as { url?: string; taskId?: string } | null;
  const url = data?.url ?? "/";
  const taskId = data?.taskId;
  event.waitUntil(
    (async () => {
      const clients = (await sw.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      })) as readonly WindowClient[];
      const existing = clients[0];
      if (existing) {
        await existing.focus();
        // Tab already open: route in-SPA (React Router opens EditTaskSheet via
        // useTaskDeepLink) instead of a hard navigation that would reload.
        if (taskId) existing.postMessage({ type: "cura-open-task", taskId });
        return;
      }
      // Cold start: the url carries ?taak=<id>, which useTaskDeepLink reads on
      // mount. `url` comes straight from the push payload (server-sent JSON,
      // never validated) — Clients.openWindow() accepts cross-origin URLs per
      // spec, so a forged/intercepted payload could otherwise send a
      // notification tap to a phishing site. Resolve against our own origin
      // and fall back to "/" for anything that isn't actually same-origin (#168).
      const target = new URL(url, sw.location.origin);
      const safeUrl = target.origin === sw.location.origin ? target.toString() : "/";
      await sw.clients.openWindow(safeUrl);
    })(),
  );
});

// Best-effort resilience when the push service rotates a subscription. Re-subscribe
// reusing the old options (which carry the VAPID applicationServerKey, so the SW
// needs no env access), and nudge any open client to persist the new endpoint.
// The primary reconciliation is usePushSubscription re-subscribing + upserting on
// every app open, so a rotation while the app is closed is healed on next launch.
sw.addEventListener("pushsubscriptionchange", (event) => {
  const e = event as ExtendableEvent & { oldSubscription?: PushSubscription | null };
  e.waitUntil(
    (async () => {
      try {
        const options = e.oldSubscription?.options;
        if (!options) return;
        await sw.registration.pushManager.subscribe(options as PushSubscriptionOptionsInit);
        const clients = await sw.clients.matchAll({ type: "window", includeUncontrolled: true });
        for (const c of clients) c.postMessage({ type: "cura-pushchange" });
      } catch {
        // Swallow — next app open reconciles the server row.
      }
    })(),
  );
});
