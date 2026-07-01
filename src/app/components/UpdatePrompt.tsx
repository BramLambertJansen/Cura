import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useAppUpdate } from "../lib/useAppUpdate";

/** Headless — shows one calm, dismissable toast (not a hard reload or a browser confirm()) when a new build is ready. */
export function UpdatePrompt() {
  const { needRefresh, updateServiceWorker } = useAppUpdate();
  const shown = useRef(false);

  useEffect(() => {
    if (!needRefresh || shown.current) return;
    shown.current = true;
    toast("Er is een nieuwe versie van Cura", {
      description: "Vernieuw wanneer het jou uitkomt.",
      duration: Infinity,
      action: { label: "Vernieuwen", onClick: () => { void updateServiceWorker(); } },
    });
  }, [needRefresh, updateServiceWorker]);

  return null;
}
