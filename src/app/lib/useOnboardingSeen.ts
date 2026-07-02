import { useCallback, useState } from "react";

const STORAGE_KEY = "cura:onboarding-seen";

function readSeen(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Whether this browser has already seen the three-pillars intro (design brief
 * §4.6) — a one-time, device-local nicety, not a domain fact worth syncing
 * across devices or the household.
 */
export function useOnboardingSeen(): { seen: boolean; markSeen: () => void } {
  const [seen, setSeen] = useState<boolean>(readSeen);

  const markSeen = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Private browsing etc. — worst case the intro reappears next time.
    }
    setSeen(true);
  }, []);

  return { seen, markSeen };
}
