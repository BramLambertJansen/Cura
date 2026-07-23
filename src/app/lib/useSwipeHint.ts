import { useCallback, useState } from "react";

const STORAGE_KEY = "cura:swipe-hint-seen";

function readSeen(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Whether this browser has already dismissed Vandaag's one-time swipe-gesture
 * hint (banner + first-row peek animation) — device-local, same pattern as
 * useOnboardingSeen.
 */
export function useSwipeHint(): { seen: boolean; dismiss: () => void } {
  const [seen, setSeen] = useState<boolean>(readSeen);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Private browsing etc. — worst case the hint reappears next time.
    }
    setSeen(true);
  }, []);

  return { seen, dismiss };
}
