import { useCallback, useState } from "react";

export type ReactieKind = "bedankt" | "mooi_gedaan" | "volgende";

/**
 * Warm, one-tap reactions to a Samen activity ("Bedank" / "Mooi gedaan" /
 * "Ik pak de volgende") — a soft social gesture, not a scoreboard event.
 * Client-side only and scoped to today: Realtime is deferred (CLAUDE.md §4),
 * so there's no cross-device delivery to promise yet; this just remembers,
 * on this device, that you already acknowledged an activity so the row
 * doesn't invite repeat-tapping. One reaction per activity, easy to replace.
 */
function storageKey(): string {
  const today = new Date().toISOString().slice(0, 10);
  return `cura:reacties:${today}`;
}

function readReacties(): Record<string, ReactieKind> {
  try {
    const raw = localStorage.getItem(storageKey());
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function useReacties(): {
  reactionFor: (activityKey: string) => ReactieKind | undefined;
  react: (activityKey: string, kind: ReactieKind) => void;
} {
  const [reacties, setReacties] = useState<Record<string, ReactieKind>>(readReacties);

  const react = useCallback((activityKey: string, kind: ReactieKind) => {
    setReacties((prev) => {
      const next = { ...prev, [activityKey]: kind };
      localStorage.setItem(storageKey(), JSON.stringify(next));
      return next;
    });
  }, []);

  return { reactionFor: (activityKey: string) => reacties[activityKey], react };
}
