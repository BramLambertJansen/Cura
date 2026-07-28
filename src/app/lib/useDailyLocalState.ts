import { useCallback, useState } from "react";

export function dailyStorageKey(prefix: string, date = new Date()): string {
  return `${prefix}:${date.toISOString().slice(0, 10)}`;
}

function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeRaw(key: string, raw: string): void {
  try {
    localStorage.setItem(key, raw);
  } catch {
    // Private browsing / full quota — worst case this device forgets by reload.
  }
}

/**
 * Day-scoped, JSON-backed React state in localStorage — the shared shape
 * behind useNietVandaag/useTaskDismissals (both Set<string>) (#162). Each
 * caller supplies its own prefix/empty value and encode/decode, since a Set
 * isn't JSON-native and needs array round-tripping.
 *
 * The storage key is (re)computed from `prefix` at both initial-read and
 * every `update()` call, not memoized across the hook's lifetime — so a
 * write right after a midnight rollover lands under today's key, not a
 * stale one captured at an earlier render (mirrors the original per-hook
 * implementations this replaced, which recomputed the key inside every
 * setter call).
 */
export function useDailyLocalState<T>(
  prefix: string,
  empty: T,
  decode: (raw: string) => T,
  encode: (value: T) => string,
): [T, (updater: (prev: T) => T) => void] {
  const [value, setValue] = useState<T>(() => {
    const raw = readRaw(dailyStorageKey(prefix));
    if (raw === null) return empty;
    try {
      return decode(raw);
    } catch {
      return empty;
    }
  });

  const update = useCallback(
    (updater: (prev: T) => T) => {
      setValue((prev) => {
        const next = updater(prev);
        if (next === prev) return prev;
        writeRaw(dailyStorageKey(prefix), encode(next));
        return next;
      });
    },
    [prefix, encode],
  );

  return [value, update];
}
