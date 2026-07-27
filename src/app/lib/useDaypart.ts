import { useEffect, useState } from "react";
import { getDaypart, type Daypart } from "./format";

// Shared across every useDaypart() call site (App.tsx's nav scrim, PageBanner,
// AppBackground — #158) instead of each mounting its own setInterval for the
// exact same computation. One module-level ticker keeps a cached value and
// notifies whoever's currently listening; the interval itself only runs while
// at least one component actually needs it, and stops the moment the last one
// unmounts instead of ticking forever in the background.
let cachedDaypart: Daypart = getDaypart();
const listeners = new Set<(d: Daypart) => void>();
let intervalId: ReturnType<typeof setInterval> | null = null;

function tick() {
  const next = getDaypart();
  if (next === cachedDaypart) return;
  cachedDaypart = next;
  for (const listener of listeners) listener(next);
}

function subscribe(listener: (d: Daypart) => void): () => void {
  listeners.add(listener);
  intervalId ??= setInterval(tick, 60_000);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };
}

/**
 * Live shell daypart (ochtend/middag/avond), re-derived once a minute so the
 * background wash and bottom-nav fade don't stay stuck on the previous
 * daypart if the app is left open across a boundary — same re-tick pattern
 * as Vandaag's own `nuDagdeel` (VandaagPage.tsx).
 */
export function useDaypart(): Daypart {
  // Computed fresh on mount rather than trusting `cachedDaypart` — the shared
  // interval only runs while at least one component is subscribed, so the
  // cache can be dormant (and stale) if every daypart-consumer happened to
  // have unmounted since its last tick.
  const [daypart, setDaypart] = useState(() => getDaypart());
  useEffect(() => subscribe(setDaypart), []);
  return daypart;
}
