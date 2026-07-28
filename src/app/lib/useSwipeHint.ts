import { useLocalFlag } from "./useLocalFlag";

const STORAGE_KEY = "cura:swipe-hint-seen";

/**
 * Whether this browser has already dismissed Vandaag's one-time swipe-gesture
 * hint (banner + first-row peek animation) — device-local, same pattern as
 * useOnboardingSeen.
 */
export function useSwipeHint(): { seen: boolean; dismiss: () => void } {
  const { seen, mark } = useLocalFlag(STORAGE_KEY);
  return { seen, dismiss: mark };
}
