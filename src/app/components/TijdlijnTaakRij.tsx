import { forwardRef, memo, useEffect } from "react";
import { animate, motion } from "motion/react";
import { Check, RotateCcw, Timer, X } from "lucide-react";
import type { TaskView } from "../../data/types";
import { useSwipeRow } from "../lib/useSwipeRow";
import { Checkbox, IconButton, SwipeReveal } from "./shared";
import { TaakRijContent } from "./TaakRijContent";

/**
 * A single task row inside Vandaag's dagdeel-tijdlijn — the timeline variant of
 * TaakRij. Rows sit directly inside one shared white group-card, without the
 * per-row card chrome (background/border/shadow) TaakRij carries elsewhere.
 * Everything else (swipe right to toggle, swipe left to dismiss, tap to edit,
 * interval/wekker/claimed badges) mirrors TaakRij exactly — both share the
 * drag mechanics via `useSwipeRow` — so the interaction language stays one
 * thing across Vandaag/Huis/Taken; only the visual shell differs here.
 */
export const TijdlijnTaakRij = memo(forwardRef<HTMLDivElement, {
  task: TaskView;
  onToggle: () => void;
  onEdit?: () => void;
  onDismiss?: () => void;
  onStartFocus?: () => void;
  /** One-time "peek" nudge (22px right and back) to hint that the row is swipeable — first row only, until the swipe hint is dismissed. */
  peek?: boolean;
}>(function TijdlijnTaakRij({
  task, onToggle, onEdit, onDismiss, onStartFocus, peek,
}, ref) {
  const { x, dragProps, reduceMotion } = useSwipeRow({ onToggle, onDismiss });

  useEffect(() => {
    if (!peek || reduceMotion) return;
    const controls = animate(x, [0, 22, 0], { duration: 0.7, ease: "easeInOut" });
    return () => controls.stop();
    // Intentionally mount-only: a one-time nudge, not a reaction to prop changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const canDismiss = Boolean(onDismiss);

  const content = <TaakRijContent task={task} />;

  return (
    <motion.div ref={ref} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: task.done ? 0.48 : 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.28 }} className="relative">
      {/* Unlike TaakRij's own card, this row has no opaque background of its own
          (it sits directly on the shared white group-card) — so the reveal tint
          must fade in/out with the drag too, not just the circle inside it, or
          it would show through at rest instead of staying hidden underneath. */}
      <SwipeReveal
        x={x}
        side="right"
        tone="primary"
        padding="pl-9"
        rounded="rounded-xl"
        fadeBackground
        icon={task.done ? <RotateCcw size={13} strokeWidth={2.5} className="text-white" /> : <Check size={13} strokeWidth={3} className="text-white" />}
      />
      {canDismiss && (
        <SwipeReveal x={x} side="left" tone="destructive" padding="pr-4" rounded="rounded-xl" fadeBackground icon={<X size={13} strokeWidth={3} className="text-white" />} />
      )}
      <motion.div
        {...dragProps}
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
        {onStartFocus && !task.done && (
          <div className="flex-shrink-0 self-center">
            <IconButton
              size={8}
              onClick={onStartFocus}
              label={`Focus starten op ${task.title}`}
              icon={<Timer size={14} aria-hidden="true" />}
            />
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}));
