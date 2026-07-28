import { useCallback } from "react";
import { useDailyLocalState } from "./useDailyLocalState";

export type ReactieKind = "bedankt" | "mooi_gedaan" | "volgende";

const PREFIX = "cura:reacties";
const EMPTY: Record<string, ReactieKind> = {};
const decode = (raw: string): Record<string, ReactieKind> => JSON.parse(raw);
const encode = (value: Record<string, ReactieKind>): string => JSON.stringify(value);

/**
 * Warm, one-tap reactions to a Samen activity ("Bedank" / "Mooi gedaan" /
 * "Ik pak de volgende") — a soft social gesture, not a scoreboard event.
 * Client-side only and scoped to today: Realtime is deferred (CLAUDE.md §4),
 * so there's no cross-device delivery to promise yet; this just remembers,
 * on this device, that you already acknowledged an activity so the row
 * doesn't invite repeat-tapping. One reaction per activity, easy to replace.
 */
export function useReacties(): {
  reactionFor: (activityKey: string) => ReactieKind | undefined;
  react: (activityKey: string, kind: ReactieKind) => void;
} {
  const [reacties, update] = useDailyLocalState(PREFIX, EMPTY, decode, encode);

  const react = useCallback((activityKey: string, kind: ReactieKind) => {
    update((prev) => ({ ...prev, [activityKey]: kind }));
  }, [update]);

  return { reactionFor: (activityKey: string) => reacties[activityKey], react };
}
