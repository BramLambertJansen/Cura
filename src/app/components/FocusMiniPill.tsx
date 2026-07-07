import { useLocation, useNavigate } from "react-router";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Coffee, Timer } from "lucide-react";
import { usePomodoroStore } from "../../stores/usePomodoroStore";
import { formatCountdown } from "../lib/format";
import { RingProgress } from "./shared";

/**
 * Klein zwevend pilletje dat verschijnt zodra de focustimer loopt (of gepauzeerd
 * is) en je NIET op het focus-scherm bent — tik = terug naar de timer. Zit
 * linksonder, boven de `BottomNav` en naast de gecentreerde FAB, zodat het niks
 * overlapt. De tik-hook op MainShell-niveau houdt de tijd bij; dit pilletje
 * rendert alleen mee.
 */
export function FocusMiniPill() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const status = usePomodoroStore((s) => s.status);
  const phase = usePomodoroStore((s) => s.phase);
  const remainingSec = usePomodoroStore((s) => s.remainingSec);
  const totalSec = usePomodoroStore((s) => s.totalSec);

  const visible = status !== "idle" && !pathname.startsWith("/focus");
  const elapsed = totalSec > 0 ? 1 - remainingSec / totalSec : 0;
  const paused = status === "paused";

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          key="focus-mini-pill"
          onClick={() => navigate("/focus")}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
          whileTap={{ scale: 0.95 }}
          aria-label={`Focustimer, ${formatCountdown(remainingSec)} resterend${paused ? ", gepauzeerd" : ""} — openen`}
          className="fixed z-40 flex items-center gap-2.5 rounded-full pl-2 pr-4 py-2 focus-ring"
          style={{
            bottom: "calc(var(--safe-bottom) + 5.75rem)",
            left: "calc(var(--safe-left) + 1.25rem)",
            background: "color-mix(in srgb, var(--card) 94%, transparent)",
            backdropFilter: "blur(24px) saturate(200%)",
            border: "1px solid color-mix(in srgb, var(--border-color) 9%, transparent)",
            boxShadow: "var(--shadow-card-lg)",
          }}>
          <span className="relative flex items-center justify-center" aria-hidden="true">
            <RingProgress value={elapsed} size={26} stroke={3} />
            <span className="absolute flex items-center justify-center text-muted-foreground">
              {phase === "break" ? <Coffee size={11} /> : <Timer size={11} />}
            </span>
          </span>
          <span className="text-sm font-semibold text-foreground tabular-nums font-display leading-none">
            {formatCountdown(remainingSec)}
          </span>
          {paused && (
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">pauze</span>
          )}
        </motion.button>
      )}
    </AnimatePresence>
  );
}
