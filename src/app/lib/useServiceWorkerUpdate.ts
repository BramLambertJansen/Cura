import { useEffect } from "react";
import { toast } from "sonner";

/**
 * Registers the PWA service worker and, when a new version has installed in
 * the background, shows a calm toast with a "Vernieuwen" action instead of
 * silently swapping the app out from under an open tab.
 */
export function useServiceWorkerUpdate(): void {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { registerSW } = await import("virtual:pwa-register");
      if (cancelled) return;
      const updateSW = registerSW({
        onNeedRefresh() {
          toast("Er is een nieuwe versie van Cura.", {
            description: "Vernieuw om de laatste versie te gebruiken.",
            duration: Infinity,
            action: { label: "Vernieuwen", onClick: () => updateSW(true) },
          });
        },
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);
}
