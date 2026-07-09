import type { MouseEvent as ReactMouseEvent } from "react";
import { useRef } from "react";
import { useMotionValue, useReducedMotion, type PanInfo } from "motion/react";

// Swipe-right-to-toggle: pointer distance (px) that commits the gesture, or a
// shorter-but-fast flick. The row itself follows at dragElastic's pace, so
// these are finger distances, not visual row offsets. Shared by every
// swipeable task row (TaakRij, TijdlijnTaakRij) so the commit feel is one thing.
export const SWIPE_COMMIT_DISTANCE = 96;
export const SWIPE_FLICK_DISTANCE = 48;
export const SWIPE_FLICK_VELOCITY = 650;
export const SWIPE_LEFT_COMMIT_DISTANCE = 96;

/**
 * Swipe-right-to-toggle / swipe-left-to-dismiss drag mechanics for a task row.
 * Returns the motion `x` value (feed it to reveal-layer `useTransform` calls)
 * and `dragProps` to spread onto the row's draggable `motion.div` — an
 * enhancement layered on top of the checkbox, never a replacement for it
 * (CLAUDE.md §6: the checkbox stays the keyboard/screenreader route).
 */
export function useSwipeRow({ onToggle, onDismiss, onSwipeRight }: { onToggle: () => void; onDismiss?: () => void; onSwipeRight?: () => void }) {
  const reduceMotion = useReducedMotion();
  const x = useMotionValue(0);
  // Releasing a drag still fires a click on whatever child the pointer ends over
  // (the edit button) — swallow that one click so a swipe never doubles as a tap.
  const wasDragged = useRef(false);

  function handleDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    const commitRight =
      info.offset.x > SWIPE_COMMIT_DISTANCE ||
      (info.offset.x > SWIPE_FLICK_DISTANCE && info.velocity.x > SWIPE_FLICK_VELOCITY);
    const commitLeft = info.offset.x < -SWIPE_LEFT_COMMIT_DISTANCE;

    if (commitRight) (onSwipeRight ?? onToggle)();
    if (commitLeft && onDismiss) onDismiss();

    // The synthetic click dispatches right after pointerup; clear the flag a tick later.
    setTimeout(() => { wasDragged.current = false; }, 0);
  }

  return {
    x,
    dragProps: {
      drag: reduceMotion ? (false as const) : ("x" as const),
      dragConstraints: { left: 0, right: 0 },
      dragElastic: { left: 0.7, right: 0.7 },
      dragMomentum: false,
      onDragStart: () => { wasDragged.current = true; },
      onDragEnd: handleDragEnd,
      onClickCapture: (e: ReactMouseEvent) => {
        if (wasDragged.current) {
          e.preventDefault();
          e.stopPropagation();
        }
      },
    },
  };
}
