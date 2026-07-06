import { useCallback, useMemo } from "react";
import { useCuraStore } from "../../stores/useCuraStore";

/**
 * Client side of Web Push: turn the browser's PushSubscription into rows the
 * server-side scheduler can send to (via the store / DataStore), and tear it
 * down again. The "which tasks are due" logic and the actual sending live
 * elsewhere (data/reminders.ts + the send-reminders edge function); this hook
 * only owns subscribe/unsubscribe + feature detection.
 *
 * Requires a configured VAPID public key (VITE_VAPID_PUBLIC_KEY). In local mode
 * the store's save/delete are no-ops, so calling these is harmless there.
 */

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export function isPushSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator &&
    typeof window !== "undefined" &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * Is the app running as an installed (home-screen) PWA? On iOS, Web Push works
 * ONLY from the standalone app, never a Safari tab — the ProfielSheet uses this
 * to show "zet Cura op je beginscherm" guidance instead of a dead toggle.
 */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia?.("(display-mode: standalone)").matches === true || nav.standalone === true;
}

/** Rough iOS/iPadOS detection — for the "add to home screen" push guidance. */
export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iP(hone|ad|od)/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

/** VAPID keys are urlsafe-base64; PushManager wants the raw bytes. */
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

function extractKeys(sub: PushSubscription): { endpoint: string; p256dh: string; auth: string } | null {
  const json = sub.toJSON();
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!json.endpoint || !p256dh || !auth) return null;
  return { endpoint: json.endpoint, p256dh, auth };
}

export function usePushSubscription() {
  const savePushSubscription = useCuraStore((s) => s.savePushSubscription);
  const deletePushSubscription = useCuraStore((s) => s.deletePushSubscription);

  const supported = useMemo(() => isPushSupported() && !!VAPID_PUBLIC_KEY, []);

  /** Subscribe this browser and persist it. Returns false if unsupported/unconfigured. */
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!supported || !VAPID_PUBLIC_KEY) return false;
    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    const sub =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      }));
    const keys = extractKeys(sub);
    if (!keys) return false;
    await savePushSubscription(keys);
    return true;
  }, [supported, savePushSubscription]);

  /** Unsubscribe this browser and drop its server row. */
  const unsubscribe = useCallback(async (): Promise<void> => {
    if (!("serviceWorker" in navigator)) return;
    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    if (!existing) return;
    const { endpoint } = existing;
    await existing.unsubscribe();
    await deletePushSubscription(endpoint);
  }, [deletePushSubscription]);

  return { supported, standalone: isStandalone(), subscribe, unsubscribe };
}
