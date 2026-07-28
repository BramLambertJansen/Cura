import { useCallback } from "react";
import { useDailyLocalState } from "./useDailyLocalState";

const PREFIX = "cura:task-dismissed";
const EMPTY = new Set<string>();
const decode = (raw: string): Set<string> => {
  const parsed = JSON.parse(raw);
  return new Set(Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : []);
};
const encode = (value: Set<string>): string => JSON.stringify([...value]);

export function useTaskDismissals(): { isDismissed: (taskId: string) => boolean; dismiss: (taskId: string) => void; restore: (taskId: string) => void } {
  const [dismissed, update] = useDailyLocalState(PREFIX, EMPTY, decode, encode);

  const dismiss = useCallback((taskId: string) => {
    update((prev) => new Set(prev).add(taskId));
  }, [update]);

  // Undo a dismissal (the "Ongedaan maken" toast action) — a mis-swipe shouldn't
  // strand a task until tomorrow.
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
