import { useCallback, useState } from "react";

/**
 * "Niet vandaag" is a soft, reversible dismissal of a suggestion — not a
 * domain decision worth syncing across devices/household members, so it
 * lives client-side only, scoped to today's date. Tomorrow the task is a
 * fresh candidate again; nothing is ever permanently hidden.
 */
function storageKey(): string {
  const today = new Date().toISOString().slice(0, 10);
  return `cura:niet-vandaag:${today}`;
}

function readDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(storageKey());
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export function useNietVandaag(): { isDismissed: (taskId: string) => boolean; dismiss: (taskId: string) => void; restore: (taskId: string) => void } {
  const [dismissed, setDismissed] = useState<Set<string>>(readDismissed);

  const dismiss = useCallback((taskId: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(taskId);
      localStorage.setItem(storageKey(), JSON.stringify([...next]));
      return next;
    });
  }, []);

  // Undo — the "Ongedaan maken" toast action brings a suggestion straight back.
  const restore = useCallback((taskId: string) => {
    setDismissed((prev) => {
      if (!prev.has(taskId)) return prev;
      const next = new Set(prev);
      next.delete(taskId);
      localStorage.setItem(storageKey(), JSON.stringify([...next]));
      return next;
    });
  }, []);

  return { isDismissed: (taskId: string) => dismissed.has(taskId), dismiss, restore };
}
