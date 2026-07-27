import { useEffect, useRef } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000; // hourly is plenty for a household planner

/**
 * Wraps vite-plugin-pwa's `useRegisterSW` — registerType is 'prompt' (vite.config.ts),
 * so a new service worker waits in the background instead of taking over the tab
 * mid-task; `needRefresh` flips once one is ready and `updateServiceWorker` is the
 * one explicit action that applies it. Periodically nudges the browser to check for
 * a new version while the tab stays open, since a long session otherwise only finds
 * out on the next natural reload.
 */
export function useAppUpdate(): { needRefresh: boolean; updateServiceWorker: () => Promise<void> } {
  // Stashed in a ref (not a plain local) because onRegisteredSW fires from the
  // plugin's own registration flow, not from this render — the only reliable
  // place left to clear it is an effect's unmount cleanup (#158: this used to
  // leak, ticking forever across HMR reloads / StrictMode's double-invoke).
  const updateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      updateIntervalRef.current = setInterval(() => { void registration.update(); }, UPDATE_CHECK_INTERVAL_MS);
    },
  });

  useEffect(() => {
    return () => {
      if (updateIntervalRef.current !== null) clearInterval(updateIntervalRef.current);
    };
  }, []);

  return { needRefresh, updateServiceWorker: () => updateServiceWorker(true) };
}
