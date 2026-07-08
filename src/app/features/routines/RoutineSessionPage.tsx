import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { Check, SkipForward, X } from "lucide-react";
import { useCuraStore } from "../../../stores/useCuraStore";
import { useRoutineView } from "../../../stores/useViews";
import { fadeUp } from "../../lib/motion";
import { IconBadge, IconButton, PillButton, PrimaryButton, RingProgress } from "../../components/shared";

/**
 * Volledig-scherm sessie om een routine's open taken één voor één af te vinken
 * (CLAUDE.md §5, Routines). Geen eigen store/gepersisteerde voortgang — `done`
 * per taak komt live uit `useRoutineView`, dus wegnavigeren en herstarten
 * hervat vanzelf. "Overslaan" is puur sessie-lokaal en niet gepersisteerd.
 */
export function RoutineSessionPage() {
  const { bundleId } = useParams<{ bundleId: string }>();
  const navigate = useNavigate();
  const routine = useRoutineView(bundleId ?? "");
  const toggleTask = useCuraStore((s) => s.toggleTask);
  const [skipped, setSkipped] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!routine) navigate("/routines", { replace: true });
  }, [routine, navigate]);

  if (!routine) return null;

  const done = routine.tasks.filter((t) => t.done).length;
  const total = routine.tasks.length;
  const openTasks = routine.tasks.filter((t) => !t.done);
  const currentTask = openTasks.find((t) => !skipped.has(t.id)) ?? openTasks[0] ?? null;

  return (
    <div className="relative min-h-full flex flex-col px-5 pt-14 pb-10">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2.5">
          <RingProgress value={total > 0 ? done / total : 0} size={34} stroke={3} />
          <span className="text-xs tabular-nums font-medium text-muted-foreground">{done} van {total}</span>
        </div>
        <IconButton icon={<X size={16} aria-hidden="true" />} onClick={() => navigate("/routines")} label="Sessie sluiten" tone="card" />
      </div>

      <p className="text-xs font-medium text-muted-foreground mb-1 tracking-wide">{routine.name}</p>

      <AnimatePresence mode="wait" initial={false}>
        {currentTask ? (
          <motion.div
            key={currentTask.id}
            variants={fadeUp}
            initial="initial"
            animate="animate"
            exit={{ opacity: 0, y: -8 }}
            className="flex-1 flex flex-col justify-center gap-7">
            <div>
              <h1 className="text-[1.9rem] leading-[1.12] text-foreground font-medium font-display">{currentTask.title}</h1>
              {currentTask.description && (
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{currentTask.description}</p>
              )}
              {(currentTask.room || currentTask.duration) && (
                <p className="text-xs text-muted-foreground mt-3">
                  {[currentTask.room, currentTask.duration].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
            <div className="space-y-3">
              <PrimaryButton icon={<Check size={16} aria-hidden="true" />} onClick={() => toggleTask(currentTask.id, true)}>
                Afvinken
              </PrimaryButton>
              <div className="flex justify-center">
                <PillButton
                  icon={<SkipForward size={13} aria-hidden="true" />}
                  onClick={() => setSkipped((prev) => new Set(prev).add(currentTask.id))}
                  ariaLabel={`${currentTask.title} overslaan voor nu`}>
                  Overslaan
                </PillButton>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="klaar"
            variants={fadeUp}
            initial="initial"
            animate="animate"
            role="status"
            aria-live="polite"
            className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
            <IconBadge icon={<Check size={18} aria-hidden="true" />} size={48} />
            <p className="text-lg font-medium text-foreground font-display">Routine gedaan voor nu.</p>
            <div className="w-full max-w-xs">
              <PrimaryButton onClick={() => navigate("/routines")}>Terug naar Routines</PrimaryButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
