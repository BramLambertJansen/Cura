import { useLayoutEffect, type RefObject } from "react";
import { useLocation } from "react-router";

/**
 * Start every new page at the top of the shell's scroll container.
 *
 * `MainShell` is `fixed inset-0` and only its `<main>` scrolls (§App-shell), so
 * there is exactly one scroll container and it outlives every route — nothing
 * reset it on navigation. Tapping a room from halfway down Huis therefore
 * opened the room detail already scrolled past its hero, and the same offset
 * leaked across every tab switch.
 *
 * Keyed on `pathname`, not `location.key`: a REPLACE that only rewrites the
 * query string is a URL cleanup, not a new destination — `useTaskDeepLink`
 * strips its `?taak=` param that way while the edit sheet is open, and that
 * must not yank the page out from under the sheet.
 *
 * A layout effect with a plain `scrollTop` assignment, on purpose: it lands
 * before paint so the new page never flashes at the old offset, and an instant
 * jump keeps it from fighting the route transition (a smooth scroll would
 * animate against `AnimatePresence`'s own enter/exit).
 *
 * Deliberately not scroll *restoration*: going back also lands at the top. Real
 * restoration would have to re-apply a saved offset to the incoming page, but
 * `AnimatePresence mode="wait"` only mounts it after the outgoing page has
 * finished animating out, so the offset would be clamped against a container
 * that hasn't reached its full height yet. That needs height-aware sequencing;
 * this hook stays the predictable one-rule version.
 */
export function useScrollToTop(ref: RefObject<HTMLElement | null>) {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = 0;
  }, [pathname, ref]);
}
