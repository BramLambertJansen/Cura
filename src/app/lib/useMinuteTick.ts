import { useEffect, useState } from "react";

/**
 * A counter that increments once a minute — for memoized view-models (like
 * useTaskViews' done/dueHint) that read Date.now() internally but otherwise
 * only recompute when the underlying data changes. Without this, a daily
 * task's done-flip at local midnight wouldn't show until the next store
 * mutation, refresh, or navigation. Same re-tick pattern as useDaypart.
 */
export function useMinuteTick(): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);
  return tick;
}
