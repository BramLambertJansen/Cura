import { motion, AnimatePresence } from "motion/react";
import { Droplets } from "lucide-react";
import { SAGE } from "../lib/constants";
import type { PullState } from "../lib/usePullToRefresh";

/** Visual pull distance at which the pull "arms" — keep in sync with THRESHOLD in usePullToRefresh. */
const ARM_AT = 58;

/**
 * The calm water-drop that answers a pull-to-refresh gesture: it fades and
 * turns in with the pull, then breathes (same .skeleton-breathe as the
 * skeletons) while the refresh runs — never a spinner. Purely visual; the
 * gesture itself lives in usePullToRefresh.
 */
export function PullToRefreshIndicator({ pull, state }: { pull: number; state: PullState }) {
  const progress = Math.min(1, pull / ARM_AT);
  const visible = state === "refreshing" || pull > 6;
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-center"
      style={{ paddingTop: "calc(var(--safe-top) + 0.875rem)" }}
      role="status"
      aria-live="polite"
    >
      <AnimatePresence>
        {visible && (
          <motion.div
            key="ptr"
            initial={{ opacity: 0, y: -10, scale: 0.8 }}
            animate={{
              opacity: state === "refreshing" ? 1 : progress,
              y: 0,
              scale: state === "refreshing" ? 1 : 0.75 + progress * 0.25,
            }}
            exit={{ opacity: 0, y: -10, scale: 0.8 }}
            transition={{ duration: 0.18 }}
            className={`w-10 h-10 rounded-full bg-card border border-border/60 flex items-center justify-center ${state === "refreshing" ? "skeleton-breathe" : ""}`}
            style={{ boxShadow: "var(--shadow-card-lg)", color: SAGE }}
          >
            <motion.div animate={{ rotate: state === "refreshing" ? 360 : progress * 180 }} transition={state === "refreshing" ? { duration: 2.8, repeat: Infinity, ease: "linear" } : { duration: 0 }}>
              <Droplets size={18} aria-hidden="true" />
            </motion.div>
            <span className="sr-only">{state === "refreshing" ? "Bezig met verversen…" : "Trek omlaag om te verversen"}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
