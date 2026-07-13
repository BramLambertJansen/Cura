// design-sync stub for Vite's `virtual:pwa-register/react` (vite-plugin-pwa).
// esbuild can't resolve the Vite virtual module; this no-op keeps the bundle
// building. Only reached if UpdatePrompt renders in a preview — the returned
// shape matches useRegisterSW's public contract so a call never throws.
type Setter = (value: boolean) => void;

export function useRegisterSW(_options?: unknown): {
  needRefresh: [boolean, Setter];
  offlineReady: [boolean, Setter];
  updateServiceWorker: (reloadPage?: boolean) => Promise<void>;
} {
  const noop: Setter = () => {};
  return {
    needRefresh: [false, noop],
    offlineReady: [false, noop],
    updateServiceWorker: () => Promise.resolve(),
  };
}
