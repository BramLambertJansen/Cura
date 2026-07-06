import { useCallback, useState } from "react";

export function getDismissedTaskStorageKey(date = new Date()): string {
  return `cura:task-dismissed:${date.toISOString().slice(0, 10)}`;
}

export function serializeDismissedTaskIds(ids: Set<string>): string {
  return JSON.stringify([...ids]);
}

export function parseDismissedTaskIds(raw: string | null): Set<string> {
  if (!raw) return new Set();
  try {
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : []);
  } catch {
    return new Set();
  }
}

export function useTaskDismissals(): { isDismissed: (taskId: string) => boolean; dismiss: (taskId: string) => void; restore: (taskId: string) => void } {
  const [dismissed, setDismissed] = useState<Set<string>>(() => parseDismissedTaskIds(typeof localStorage !== "undefined" ? localStorage.getItem(getDismissedTaskStorageKey()) : null));

  const dismiss = useCallback((taskId: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(taskId);
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(getDismissedTaskStorageKey(), serializeDismissedTaskIds(next));
      }
      return next;
    });
  }, []);

  // Undo a dismissal (the "Ongedaan maken" toast action) — a mis-swipe shouldn't
  // strand a task until tomorrow.
  const restore = useCallback((taskId: string) => {
    setDismissed((prev) => {
      if (!prev.has(taskId)) return prev;
      const next = new Set(prev);
      next.delete(taskId);
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(getDismissedTaskStorageKey(), serializeDismissedTaskIds(next));
      }
      return next;
    });
  }, []);

  return { isDismissed: (taskId: string) => dismissed.has(taskId), dismiss, restore };
}
