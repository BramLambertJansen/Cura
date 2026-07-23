import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { Check, SkipForward, X } from "lucide-react";
import { useCuraStore } from "../../../stores/useCuraStore";
import { useRoutineView } from "../../../stores/useViews";
import { fadeUp } from "../../lib/motion";
import { SAGE } from "../../lib/constants";
import { Card, IconButton, PillButton, PrimaryButton, RingProgress } from "../../components/shared";

type DotState = "done" | "current" | "skipped" | "upcoming";

function dotState(taskId: string, done: boolean, currentId: string | null, skipped: Set<string>): DotState {
  if (done) return "done";
  if (taskId === currentId) return "current";
  if (skipped.has(taskId)) return "skipped";
  return "upcoming";
}

/** One task's spot in the session's step row — a quiet stand-in for a progress bar that still reads as "where am I in this routine". */
function TaskDot({ state }: { state: DotState }) {
  const style =
    state === "done"
      ? { width: 8, height: 8, background: SAGE, borderColor: SAGE }
      : state === "current"
        ? { width: 10, height: 10, background: "transparent", borderColor: SAGE, borderWidth: 2 }
        : state === "skipped"
          ? { width: 8, height: 8, background: "transparent", borderColor: "color-mix(in srgb, var(--outline-color) 40%, transparent)", borderWidth: 1, borderStyle: "dashed" as const }
          : { width: 8, height: 8, background: "color-mix(in srgb, var(--outline-color) 18%, transparent)", borderColor: "transparent" };
  return (
    <span
      aria-hidden="true"
      className="rounded-full flex-shrink-0"
      style={{ ...style, transition: "background-color 0.3s ease, border-color 0.3s ease" }}
    />
  );
}

/** Muted pill for a task's room/duration inside the session card — a quieter cousin of StatusBadge, since these facts aren't accomplishments. */
function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: "var(--secondary)", color: "var(--muted-foreground)" }}>
      {children}
    </span>
  );
}

/**
 * Volledig-scherm sessie om een routine's open taken één voor één af te vinken
 * (CLAUDE.md §5, Routines). Geen eigen store/gepersisteerde voortgang — `done`
 * per taak komt live uit `useRoutineView`, dus wegnavigeren en herstarten
 * hervat vanzelf. "Overslaan" is puur sessie-lokaal en niet gepersisteerd.
 * De hero-ring + taak-stippenrij blijven zichtbaar over beide staten (bezig/klaar)
 * zodat de sessie als één doorlopend moment voelt, niet als twee losse schermen.
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
  // No `?? openTasks[0]` fallback here: once every remaining open task has
  // been skipped, there is no current task left to show — the session ends,
  // same as when everything's been checked off. Skipping the last task must
  // advance to the "klaar"-screen, not loop back onto an already-skipped card.
  const currentTask = openTasks.find((t) => !skipped.has(t.id)) ?? null;
  // Scoped to this session's own remaining tasks, not the whole routine — the
  // hero ring above already shows the whole-routine "{done}/{total} gedaan"
  // ratio, so repeating that same total here would be redundant and, for a
  // routine that's mostly done already, actively misleading ("4 van 4" for
  // what's really the only card left to see).
  const position = currentTask ? openTasks.findIndex((t) => t.id === currentTask.id) + 1 : 0;

  return (
    <div className="relative min-h-full flex flex-col px-5 pt-14 pb-10 overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-80 pointer-events-none"
        style={{ background: "radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--primary) 16%, transparent) 0%, transparent 68%)" }}
      />

      <div className="relative flex flex-col flex-1">
        <div className="flex justify-end mb-2">
          <IconButton icon={<X size={16} aria-hidden="true" />} onClick={() => navigate("/routines")} label="Sessie sluiten" tone="card" />
        </div>

        <div className="flex flex-col items-center text-center mt-2 mb-7">
          <div className="relative" style={{ width: 104, height: 104 }}>
            <RingProgress value={total > 0 ? done / total : 0} size={104} stroke={7} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-foreground text-2xl leading-none tabular-nums">{done}/{total}</span>
              <span className="text-[0.65rem] text-muted-foreground mt-1 tracking-wide">gedaan</span>
            </div>
          </div>
          <h1 className="mt-4 text-2xl leading-tight text-foreground font-medium font-display">{routine.name}</h1>
          <p className="text-xs font-medium text-muted-foreground mt-1.5 tracking-wide">{routine.trigger}</p>
        </div>

        {total > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mb-8" role="img" aria-label={`${done} van ${total} taken afgerond`}>
            {routine.tasks.map((t) => (
              <TaskDot key={t.id} state={dotState(t.id, t.done, currentTask?.id ?? null, skipped)} />
            ))}
          </div>
        )}

        <AnimatePresence mode="wait" initial={false}>
          {currentTask ? (
            <motion.div
              key={currentTask.id}
              variants={fadeUp}
              initial="initial"
              animate="animate"
              exit={{ opacity: 0, y: -8 }}
              className="flex-1 flex flex-col justify-center gap-7">
              <Card className="px-6 py-8 flex flex-col items-center text-center gap-3">
                <p className="text-xs font-medium text-muted-foreground">Taak {position} van {openTasks.length}</p>
                <h2 className="text-[1.7rem] leading-[1.15] text-foreground font-medium font-display">{currentTask.title}</h2>
                {currentTask.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed">{currentTask.description}</p>
                )}
                {(currentTask.room || currentTask.duration) && (
                  <div className="flex flex-wrap justify-center gap-2 mt-1">
                    {currentTask.room && <Chip>{currentTask.room}</Chip>}
                    {currentTask.duration && <Chip>{currentTask.duration}</Chip>}
                  </div>
                )}
              </Card>
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
              className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
              <p className="text-lg font-medium text-foreground font-display">Routine gedaan voor nu.</p>
              <p className="text-sm text-muted-foreground italic font-display max-w-[240px]">{routine.hint}</p>
              <div className="w-full max-w-xs mt-3">
                <PrimaryButton onClick={() => navigate("/routines")}>Terug naar Routines</PrimaryButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
