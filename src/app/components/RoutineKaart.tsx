import { memo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import { Check, ChevronRight, Pencil, Play } from "lucide-react";
import type { RoutineView } from "../../data/types";
import { PRESS_TINT, SAGE, SHADOW } from "../lib/constants";
import { CARD_CHROME, RingProgress, Card, PillButton, StatusBadge } from "./shared";

function routineTone(routine: RoutineView): string {
  const done = routine.tasks.filter((t) => t.done).length;
  const total = routine.tasks.length;
  if (total > 0 && done === total) return "Rond voor nu";
  if (routine.windowSize > 0) return routine.hint;
  if (total > 0) return "Rustig op te pakken";
  return "Nog leeg";
}

function routineWindowLine(routine: RoutineView): string | null {
  if (routine.windowSize <= 0) return null;
  return `${routine.doneInWindow} van ${routine.windowSize} ${routine.windowLabel}`;
}

/**
 * Vandaag's timeline-variant routine card — a fixed-width tile meant for a
 * horizontally scrolling row (see VandaagPage), not the vertical stack the
 * older compact card used. Ring progress + trigger + count only; no inline
 * subtask checkboxes here — "Start" hands off to the existing full-screen
 * routine session (`/routines/:id/starten`), the same route RoutineKaart's own
 * Start button already navigates to.
 */
export const RoutineKaartCompact = memo(function RoutineKaartCompact({ routine }: { routine: RoutineView }) {
  const navigate = useNavigate();
  const done = routine.tasks.filter((t) => t.done).length;
  const total = routine.tasks.length;
  const allDone = total > 0 && done === total;
  return (
    <Card tone="active" className="px-3.5 py-4 flex flex-col items-start gap-2.5">
      <div className="relative">
        <RingProgress value={total > 0 ? done / total : 0} size={44} stroke={3.5} />
        {allDone && (
          <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
            <Check size={15} strokeWidth={3} style={{ color: "var(--chart-4)" }} />
          </span>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{routine.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5 font-display italic truncate">{routineTone(routine)}</p>
      </div>
      {allDone ? (
        <StatusBadge>Klaar</StatusBadge>
      ) : total > 0 ? (
        <PillButton
          size="sm"
          icon={<Play size={11} aria-hidden="true" />}
          onClick={() => navigate(`/routines/${routine.id}/starten`)}
          ariaLabel={`${routine.name} starten`}
          className="w-full justify-center">
          Start
        </PillButton>
      ) : null}
    </Card>
  );
});

export const RoutineKaart = memo(function RoutineKaart({
  routine, onToggleTask, onEdit,
}: { routine: RoutineView; onToggleTask: (taskId: string) => void; onEdit: () => void }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const done = routine.tasks.filter((t) => t.done).length;
  const total = routine.tasks.length;
  return (
    <div className={`rounded-3xl overflow-hidden ${CARD_CHROME}`} style={{ boxShadow: SHADOW }}>
      <motion.button
        whileTap={{ backgroundColor: PRESS_TINT }}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={`${routine.name} ${open ? "inklappen" : "uitklappen"}`}
        className="w-full flex items-center gap-4 text-left transition-colors px-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color-mix(in_srgb,var(--primary)_40%,transparent)]"
        style={{ paddingTop: "1.1rem", paddingBottom: "1.1rem" }}>
        <RingProgress value={total > 0 ? done / total : 0} size={44} stroke={3.5} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-foreground">{routine.name}</p>
            {done === total && done > 0 && (
              <StatusBadge>Klaar</StatusBadge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{routine.trigger}</p>
          <p className="text-xs mt-1 leading-snug font-display italic" style={{ color: "var(--muted-foreground)" }}>
            {routineTone(routine)}
          </p>
          {routineWindowLine(routine) && (
            <p className="text-[0.68rem] text-muted-foreground/70 mt-1">{routineWindowLine(routine)}</p>
          )}
        </div>
        <motion.div animate={{ rotate: open ? 90 : 0 }} transition={{ type: "spring", stiffness: 400, damping: 30 }}>
          <ChevronRight size={16} className="text-muted-foreground flex-shrink-0" aria-hidden="true" />
        </motion.div>
      </motion.button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ type: "spring", stiffness: 360, damping: 34 }} className="overflow-hidden">
            <div className="px-5 pb-4 pt-2 border-t border-border/40 space-y-3.5">
              {routine.tasks.map((t) => (
                <motion.button
                  key={t.id}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => onToggleTask(t.id)}
                  role="checkbox"
                  aria-checked={t.done}
                  aria-label={t.done ? `${t.title} als niet gedaan markeren` : `${t.title} afvinken`}
                  className="flex items-center gap-3 w-full text-left focus-ring focus-visible:ring-offset-1 rounded-lg">
                  <div className="w-6 h-6 relative flex-shrink-0 rounded-full" aria-hidden="true">
                    <div className="absolute inset-0 rounded-full border-2 transition-colors duration-200"
                      style={{ background: t.done ? SAGE : "transparent", borderColor: t.done ? SAGE : "color-mix(in srgb, var(--outline-color) 28%, transparent)" }} />
                    {t.done && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Check size={10} strokeWidth={3.5} className="text-white" />
                      </div>
                    )}
                  </div>
                  <span className="flex-1 min-w-0">
                    <span className={`flex items-baseline gap-1.5 text-sm text-left ${t.done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {t.title}
                      {t.duration && <span className="text-xs text-muted-foreground opacity-50 flex-shrink-0">· {t.duration}</span>}
                    </span>
                    {t.description && (
                      <span className="block text-xs text-muted-foreground mt-0.5 truncate">{t.description}</span>
                    )}
                  </span>
                </motion.button>
              ))}
              <div className="pt-1 border-t border-border/30 flex items-center justify-between gap-2">
                <motion.button
                  onClick={onEdit}
                  whileTap={{ scale: 0.96 }}
                  aria-label={`${routine.name} bewerken`}
                  className="flex items-center gap-2 text-xs font-medium py-1.5 focus-ring rounded-lg px-1"
                  style={{ color: "var(--muted-foreground)" }}>
                  <Pencil size={12} aria-hidden="true" />
                  Routine bewerken
                </motion.button>
                {done < total && total > 0 && (
                  <PillButton
                    size="sm"
                    icon={<Play size={12} aria-hidden="true" />}
                    onClick={() => navigate(`/routines/${routine.id}/starten`)}
                    ariaLabel={`${routine.name} starten`}>
                    Start
                  </PillButton>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
