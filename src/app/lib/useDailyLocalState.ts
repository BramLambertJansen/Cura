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
 * The storage key is (re)computed from `prefix` at every read and every
 * `update()` call, not memoized across the hook's lifetime, and the in-memory
 * value is re-read whenever that key changes. Both halves matter: a write
 * right after a midnight rollover has to land under today's key, *and* the
 * value in state has to stop being yesterday's. Without the second half a tab
 * left open across midnight kept its dismissals forever (the "niet vandaag"
 * toast promises the task is back tomorrow — #212 review), because nothing
 * ever re-read the newly dated key. The reset rides on the next render the
 * component does anyway (Vandaag ticks every minute), so it needs no timer of
 * its own.
 */
export function useDailyLocalState<T>(
  prefix: string,
  empty: T,
  decode: (raw: string) => T,
  encode: (value: T) => string,
): [T, (updater: (prev: T) => T) => void] {
  const readForKey = (key: string): T => {
    const raw = readRaw(key);
    if (raw === null) return empty;
    try {
      return decode(raw);
    } catch {
      return empty;
    }
  };

  const [state, setState] = useState<{ day: string; value: T }>(() => {
    const day = dailyStorageKey(prefix);
    return { day, value: readForKey(day) };
  });

  // Derive-during-render (React's documented "adjust state when inputs change"
  // pattern): the day is an input like any other, so a rollover is corrected in
  // the same pass instead of one render late.
  const today = dailyStorageKey(prefix);
  let current = state;
  if (state.day !== today) {
    current = { day: today, value: readForKey(today) };
    setState(current);
  }

  const update = useCallback(
    (updater: (prev: T) => T) => {
      setState((prev) => {
        const key = dailyStorageKey(prefix);
        // A rollover between renders can land here first: start from today's
        // stored value, never from yesterday's in-memory one.
        const base = prev.day === key ? prev.value : readForKey(key);
        const next = updater(base);
        if (next === base && prev.day === key) return prev;
        writeRaw(key, encode(next));
        return { day: key, value: next };
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [prefix, encode],
  );

  return [current.value, update];
}
