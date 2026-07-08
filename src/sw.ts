/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";

/**
 * Cura service worker (vite-plugin-pwa `injectManifest`).
 *
 * Three jobs:
 *  1. Offline precache (Workbox) — what generateSW did before the switch.
 *  2. The 'prompt' update flow — activate a waiting worker ONLY when the app
 *     posts SKIP_WAITING (never unconditionally: that would silently become
 *     autoUpdate and reload mid-task, the opposite of calm — see vite.config.ts
 *     and useAppUpdate).
 *  3. Web Push — show a wekker notification when the app is closed, or hand it
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

const sw = self as unknown as ServiceWorkerGlobalScope;

// registerType:'prompt' — wait for the user's explicit "Vernieuwen" tap, which
// workbox-window (useAppUpdate) turns into this SKIP_WAITING message. Without
// this listener the in-app update toast would hang forever.
sw.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") void sw.skipWaiting();
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
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
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
      // Cold start: the url carries ?taak=<id>, which useTaskDeepLink reads on mount.
      await sw.clients.openWindow(url);
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
