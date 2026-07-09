import { memo, useRef } from "react";
import { motion, useMotionValue, useTransform, useReducedMotion, type PanInfo } from "motion/react";
import { Bell, Check, RefreshCw, RotateCcw, X } from "lucide-react";
import type { TaskView } from "../../data/types";
import { SAGE } from "../lib/constants";
import { intervalLabel } from "../lib/format";
import { Checkbox } from "./shared";
import { SWIPE_COMMIT_DISTANCE, SWIPE_FLICK_DISTANCE, SWIPE_FLICK_VELOCITY, SWIPE_LEFT_COMMIT_DISTANCE } from "./TaakRij";

/**
 * A single task row inside Vandaag's dagdeel-tijdlijn — the timeline variant of
 * TaakRij. Rows sit directly inside one shared white group-card, without the
 * per-row card chrome (background/border/shadow) TaakRij carries elsewhere.
 * Everything else (swipe right to toggle, swipe left to dismiss, tap to edit,
 * timer button, interval/wekker badges) mirrors TaakRij exactly, so the
 * interaction language stays one thing across Vandaag/Huis/Taken — only the
 * visual shell differs here.
 */
export const TijdlijnTaakRij = memo(function TijdlijnTaakRij({
  task, onToggle, onEdit, onDismiss,
}: {
  task: TaskView;
  onToggle: () => void;
  onEdit?: () => void;
  onDismiss?: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const x = useMotionValue(0);
  const revealOpacityRight = useTransform(x, [10, 48], [0, 1]);
  const revealScaleRight = useTransform(x, [10, 60], [0.6, 1]);
  const revealOpacityLeft = useTransform(x, [-48, -10], [1, 0]);
  const revealScaleLeft = useTransform(x, [-60, -10], [1, 0.6]);

  const canDismiss = Boolean(onDismiss);

  const wasDragged = useRef(false);

  function handleDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    const commitRight =
      info.offset.x > SWIPE_COMMIT_DISTANCE ||
      (info.offset.x > SWIPE_FLICK_DISTANCE && info.velocity.x > SWIPE_FLICK_VELOCITY);
    const commitLeft = info.offset.x < -SWIPE_LEFT_COMMIT_DISTANCE;

    if (commitRight) onToggle();
    if (commitLeft && canDismiss) onDismiss!();

    setTimeout(() => { wasDragged.current = false; }, 0);
  }

  const content = (
    <>
      <motion.p animate={{ color: task.done ? "var(--muted-foreground)" : "var(--foreground)" }}
        className={`text-[0.9375rem] font-medium leading-snug ${task.done ? "line-through" : ""}`}>{task.title}</motion.p>
      {task.description && (
        <p className="text-xs text-muted-foreground mt-0.5 leading-snug truncate">{task.description}</p>
      )}
      <div className="flex items-center gap-1.5 mt-[0.3rem] flex-wrap">
        {task.room && <span className="text-xs text-muted-foreground">{task.room}</span>}
        {task.duration && <span className="text-xs text-muted-foreground opacity-50">· {task.duration}</span>}
        {task.intervalDays && (
          <span className="flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
            style={{ background: "color-mix(in srgb, var(--primary) 9%, transparent)", color: SAGE }}>
            <RefreshCw size={8} aria-hidden="true" /> {intervalLabel(task.intervalDays)}
          </span>
        )}
        {task.wekkerLabel && (
          <span className="flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
            style={{ background: "color-mix(in srgb, var(--accent) 30%, transparent)", color: "var(--muted-foreground)" }}>
            <Bell size={8} aria-hidden="true" /> {task.wekkerLabel}
          </span>
        )}
      </div>
    </>
  );

  return (
    <motion.div layout animate={{ opacity: task.done ? 0.48 : 1 }} transition={{ duration: 0.28 }} className="relative">
      {/* Unlike TaakRij's own card, this row has no opaque background of its own
          (it sits directly on the shared white group-card) — so the reveal tint
          must fade in/out with the drag too, not just the circle inside it, or
          it would show through at rest instead of staying hidden underneath. */}
      <motion.div aria-hidden="true" style={{ opacity: revealOpacityRight }} className="absolute inset-0 flex items-center pl-9 pointer-events-none">
        <div className="absolute inset-0" style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)" }} />
        <motion.div style={{ scale: revealScaleRight }} className="relative w-7 h-7 rounded-full flex items-center justify-center">
          <span className="w-full h-full rounded-full flex items-center justify-center" style={{ background: SAGE }}>
            {task.done ? <RotateCcw size={13} strokeWidth={2.5} className="text-white" /> : <Check size={13} strokeWidth={3} className="text-white" />}
          </span>
        </motion.div>
      </motion.div>
      {canDismiss && (
        <motion.div aria-hidden="true" style={{ opacity: revealOpacityLeft }} className="absolute inset-0 flex items-center justify-end pr-4 pointer-events-none">
          <div className="absolute inset-0" style={{ background: "color-mix(in srgb, var(--destructive) 10%, transparent)" }} />
          <motion.div style={{ scale: revealScaleLeft }} className="relative w-7 h-7 rounded-full flex items-center justify-center">
            <span className="w-full h-full rounded-full flex items-center justify-center"
              style={{ background: "var(--destructive)" }}>
              <X size={13} strokeWidth={3} className="text-white" />
            </span>
          </motion.div>
        </motion.div>
      )}
      <motion.div
        drag={reduceMotion ? false : "x"}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0.7, right: 0.7 }}
        dragMomentum={false}
        onDragStart={() => { wasDragged.current = true; }}
        onDragEnd={handleDragEnd}
        onClickCapture={(e) => {
          if (wasDragged.current) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        className="relative z-10 flex items-stretch gap-3 py-[0.65rem]"
        style={{ x, touchAction: "pan-y" }}>
        <div className="flex-shrink-0 flex items-center justify-center">
          <Checkbox checked={task.done} onToggle={onToggle} label={task.done ? `${task.title} als niet gedaan markeren` : `${task.title} afvinken`} />
        </div>
        {onEdit ? (
          <button onClick={onEdit} aria-label={`${task.title} bewerken`} className="flex-1 min-w-0 text-left self-center cursor-pointer focus-ring rounded-lg">
            {content}
          </button>
        ) : (
          <div className="flex-1 min-w-0 self-center">{content}</div>
        )}
      </motion.div>
    </motion.div>
  );
});
