import { useLocalFlag } from "./useLocalFlag";

const STORAGE_KEY = "cura:onboarding-seen";

/**
 * Whether this browser has already seen the three-pillars intro (design brief
 * §4.6) — a one-time, device-local nicety, not a domain fact worth syncing
 * across devices or the household.
 */
export function useOnboardingSeen(): { seen: boolean; markSeen: () => void } {
  const { seen, mark } = useLocalFlag(STORAGE_KEY);
  return { seen, markSeen: mark };
}
