export const pageIn = { opacity: 0, y: 10 };
export const pageTx = { duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] };
export const spring = { type: "spring" as const, stiffness: 380, damping: 34 };
export const stagger = { animate: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } } };
export const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 400, damping: 34 } },
};
