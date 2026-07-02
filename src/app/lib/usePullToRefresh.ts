import { useEffect, useRef, useState, type RefObject } from "react";

export type PullState = "idle" | "pulling" | "refreshing";

/** Downward pointer movement (px) before the gesture counts as a pull — keeps taps and horizontal swipes (TaakRij) out of it. */
const ENGAGE_DY = 14;
/** Visual pull distance (px) at which release triggers a refresh. */
const THRESHOLD = 58;
/** Cap on how far the content follows the finger. */
const MAX_VISUAL = 96;
/** Content follows at half the finger's pace — the rubber-band feel. */
const DAMPING = 0.5;
/** Hold the indicator at least this long so a fast (local-mode) refresh still reads as deliberate, not as a glitch. */
const MIN_REFRESH_MS = 650;

/**
 * Touch-only pull-to-refresh for the app shell's scroll container. Engages
 * only when the container is scrolled to the very top and the finger clearly
 * moves down (not sideways), then owns the gesture via preventDefault so the
 * native overscroll doesn't fight it. Works in both data modes — in `local`
 * mode the refresh is near-instant and just holds its minimum beat.
 */
export function usePullToRefresh(
  ref: RefObject<HTMLElement | null>,
  onRefresh: () => Promise<void>,
): { pull: number; state: PullState } {
  const [pull, setPull] = useState(0);
  const [state, setState] = useState<PullState>("idle");
  const pullRef = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let startY = 0;
    let startX = 0;
    let tracking = false; // finger down while scrolled to the top
    let engaged = false; // passed the slop check — we own this gesture
    let refreshing = false;

    const setVisualPull = (v: number) => {
      pullRef.current = v;
      setPull(v);
    };

    function onTouchStart(e: TouchEvent) {
      if (refreshing) return;
      tracking = el!.scrollTop <= 0;
      engaged = false;
      startY = e.touches[0].clientY;
      startX = e.touches[0].clientX;
    }

    function onTouchMove(e: TouchEvent) {
      if (!tracking || refreshing) return;
      const dy = e.touches[0].clientY - startY;
      const dx = e.touches[0].clientX - startX;
      if (!engaged) {
        // Vertical intent only, and still at the very top.
        if (el!.scrollTop > 0 || dy < ENGAGE_DY || dy < Math.abs(dx) * 1.2) return;
        engaged = true;
        setState("pulling");
      }
      if (dy <= 0) {
        engaged = false;
        setVisualPull(0);
        setState("idle");
        return;
      }
      e.preventDefault();
      setVisualPull(Math.min(dy * DAMPING, MAX_VISUAL));
    }

    function onTouchEnd() {
      tracking = false;
      if (!engaged) return;
      engaged = false;
      const passed = pullRef.current >= THRESHOLD;
      setVisualPull(0);
      if (!passed) {
        setState("idle");
        return;
      }
      refreshing = true;
      setState("refreshing");
      const started = Date.now();
      void (async () => {
        try {
          await onRefresh();
        } catch {
          // Calm: the indicator simply retracts; the data stays as it was.
        }
        const remaining = MIN_REFRESH_MS - (Date.now() - started);
        if (remaining > 0) await new Promise((r) => setTimeout(r, remaining));
        refreshing = false;
        setState("idle");
      })();
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    // Non-passive: we preventDefault once the pull is engaged.
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [ref, onRefresh]);

  return { pull, state };
}
