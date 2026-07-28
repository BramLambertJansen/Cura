import { useCallback, useState } from "react";

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeFlag(key: string): void {
  try {
    localStorage.setItem(key, "1");
  } catch {
    // Private browsing / full quota — worst case the flag reappears next time.
  }
}

/**
 * A one-time, device-local "seen" boolean flag under a fixed localStorage
 * key — the shared shape behind useOnboardingSeen/useSwipeHint (#162).
 * `mark()` flips React state to true even if the write itself fails, so the
 * current session still behaves as "seen"; only a future reload would show
 * the flag as unset again.
 */
export function useLocalFlag(key: string): { seen: boolean; mark: () => void } {
  const [seen, setSeen] = useState<boolean>(() => readFlag(key));

  const mark = useCallback(() => {
    writeFlag(key);
    setSeen(true);
  }, [key]);

  return { seen, mark };
}
