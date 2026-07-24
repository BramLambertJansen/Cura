export const pageIn = { opacity: 0, y: 10 };
export const pageTx = { duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] };
export const spring = { type: "spring" as const, stiffness: 380, damping: 34 };
export const stagger = { animate: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } } };
export const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 400, damping: 34 } },
};

/**
 * A distinct "we're done" celebration — scale overshoots past 1 before
 * settling, unlike every other (purely fade/slide) transition in the app.
 * Reserved for a genuine completion moment (finishing a whole routine
 * session), never task-to-task progress — CLAUDE.md §2 avoids streaks/
 * scoreboards, but an earned, one-off "done" feeling is exactly the
 * exception that's worth its own visual weight.
 */
export const bloom = {
  initial: { scale: 0.6, opacity: 0 },
  animate: {
    scale: [0.6, 1.06, 1], opacity: 1,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
};
