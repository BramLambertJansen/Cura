import { useCallback } from "react";
import { useDailyLocalState } from "./useDailyLocalState";

const PREFIX = "cura:niet-vandaag";
const EMPTY = new Set<string>();
const decode = (raw: string): Set<string> => new Set(JSON.parse(raw));
const encode = (value: Set<string>): string => JSON.stringify([...value]);

/**
 * "Niet vandaag" is a soft, reversible dismissal of a suggestion — not a
 * domain decision worth syncing across devices/household members, so it
 * lives client-side only, scoped to today's date. Tomorrow the task is a
 * fresh candidate again; nothing is ever permanently hidden.
 */
export function useNietVandaag(): { isDismissed: (taskId: string) => boolean; dismiss: (taskId: string) => void; restore: (taskId: string) => void } {
  const [dismissed, update] = useDailyLocalState(PREFIX, EMPTY, decode, encode);

  const dismiss = useCallback((taskId: string) => {
    update((prev) => new Set(prev).add(taskId));
  }, [update]);

  // Undo — the "Ongedaan maken" toast action brings a suggestion straight back.
  const restore = useCallback((taskId: string) => {
    update((prev) => {
      if (!prev.has(taskId)) return prev;
      const next = new Set(prev);
      next.delete(taskId);
      return next;
    });
  }, [update]);

  return { isDismissed: (taskId: string) => dismissed.has(taskId), dismiss, restore };
}
