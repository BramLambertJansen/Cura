import { memo } from "react";
import { motion } from "motion/react";
import { CalendarPlus, Check, RotateCcw, Timer, X } from "lucide-react";
import type { TaskView } from "../../data/types";
import { SAGE, SHADOW } from "../lib/constants";
import { useSwipeRow } from "../lib/useSwipeRow";
import { CARD_BORDER, Checkbox, IconButton, SwipeReveal } from "./shared";
import { TaakRijContent } from "./TaakRijContent";

export const TaakRij = memo(function TaakRij({
  task, onToggle, showClaim = false, onUnclaim, onPlan, onEdit, onDismiss, onStartFocus,
}: {
  task: TaskView;
  // Id-based (not a per-row closure): callers pass one stable dispatcher —
  // usually a store action directly, which never changes identity — instead
  // of a fresh `() => toggleTask(task.id, ...)` arrow every render. That's
  // what lets `memo()` below actually skip re-rendering a row whose task
  // didn't change (#173) — a closure recreated every render defeats memo's
  // shallow prop comparison regardless of how cheap the closure itself is.
  onToggle: (taskId: string, done: boolean) => void;
  showClaim?: boolean;
  onUnclaim?: (taskId: string) => void;
  onPlan?: (taskId: string) => void;
  onEdit?: (taskId: string) => void;
  onDismiss?: (taskId: string) => void;
  /** Takes the full task (not just an id) — the row already has it, and every caller's dispatcher (useStartFocus) needs more than an id anyway. */
  onStartFocus?: (task: TaskView) => void;
}) {
  const claimed = !!task.claimedBy;
  const handleToggle = () => onToggle(task.id, !task.done);
  const handleDismiss = onDismiss ? () => onDismiss(task.id) : undefined;
  const handlePlan = onPlan ? () => onPlan(task.id) : undefined;
  // Swipe-right normally toggles done, but on an unclaimed pool row (onPlan
  // wired, e.g. Huis) it instead means "op mijn dag" — claim it for today.
  // Once someone's claimed it, swipe-right reverts to the plain toggle.
  const canPlan = Boolean(onPlan) && !claimed && !task.done;
  // Visual x of the card while swiping; the sage check behind it fades/grows in step.
  const { x, dragProps } = useSwipeRow({ onToggle: handleToggle, onDismiss: handleDismiss, onSwipeRight: canPlan ? handlePlan : undefined });
  // Gates the left-swipe reveal layer below — whatever the caller wires as
  // onDismiss (usually "niet vandaag") is what swiping left actually does.
  const canDismiss = Boolean(onDismiss);

  const content = <TaakRijContent task={task} />;
  return (
    <motion.div layout animate={{ opacity: task.done ? 0.48 : 1 }} transition={{ duration: 0.28 }} className="relative">
      {/* Revealed behind the card while swiping right — the same visual language as the checked checkbox. */}
      <SwipeReveal
        x={x}
        side="right"
        tone="primary"
        padding="pl-5"
        rounded="rounded-2xl"
        icon={canPlan
          ? <CalendarPlus size={13} strokeWidth={2.5} className="text-white" />
          : task.done
            ? <RotateCcw size={13} strokeWidth={2.5} className="text-white" />
            : <Check size={13} strokeWidth={3} className="text-white" />}
      />
      {canDismiss && (
        <SwipeReveal x={x} side="left" tone="destructive" padding="pr-5" rounded="rounded-2xl" icon={<X size={13} strokeWidth={3} className="text-white" />} />
      )}
      <motion.div
        // Swipe right to toggle (or, on an unclaimed pool row, to plan) — an
        // enhancement on top of the checkbox, never a replacement (§6: the
        // checkbox stays the keyboard/screenreader path). touchAction pan-y
        // leaves vertical scrolling native; the drag only owns horizontal movement.
        {...dragProps}
        // relative z-10 keeps the card ABOVE the absolute swipe-reveal layers — at
        // rest (x=0) it has no transform, so without this it paints as an in-flow
        // block *below* its absolute siblings and their tint bleeds over the card.
        className={`relative z-10 flex items-center gap-3.5 rounded-2xl px-4 py-[0.9rem] ${task.done ? "bg-card" : "bg-card-active"} ${CARD_BORDER}`}
        style={{
          x,
          touchAction: "pan-y",
          boxShadow: SHADOW,
          // Dynamic per-state accent (open vs done/claimed) — genuinely data-driven, stays inline.
          borderLeft: !task.done && !claimed ? `2.5px solid color-mix(in srgb, var(--primary) 18%, transparent)` : "2.5px solid transparent",
        }}>
        <Checkbox checked={task.done} onToggle={handleToggle} label={task.done ? `${task.title} als niet gedaan markeren` : `${task.title} afvinken`} />
        {onEdit ? (
          <button
            onClick={() => onEdit(task.id)}
            aria-label={`${task.title} bewerken`}
            className="flex-1 min-w-0 text-left cursor-pointer focus-ring rounded-lg">
            {content}
          </button>
        ) : (
          <div className="flex-1 min-w-0">{content}</div>
        )}
        {onStartFocus && !task.done && (
          <IconButton
            size={8}
            onClick={() => onStartFocus(task)}
            label={`Focus starten op ${task.title}`}
            icon={<Timer size={14} aria-hidden="true" />}
          />
        )}
        {showClaim && !task.done && claimed && onUnclaim && (
          <motion.button whileTap={{ scale: 0.9 }}
            onClick={() => onUnclaim(task.id)}
            aria-label={`Claim van ${task.title} loslaten`}
            className="text-xs font-semibold px-3 py-1.5 rounded-full flex-shrink-0 leading-none border focus-ring"
            style={{ borderColor: "color-mix(in srgb, var(--outline-color) 24%, transparent)", color: "var(--muted-foreground)" }}>Laat los</motion.button>
        )}
        {/* Keyboard/reduced-motion fallback for the swipe-right "op mijn dag
            zetten" gesture above — canPlan rows had no non-drag way to claim. */}
        {showClaim && canPlan && handlePlan && (
          <motion.button whileTap={{ scale: 0.9 }}
            onClick={handlePlan}
            aria-label={`${task.title} op mijn dag zetten`}
            className="text-xs font-semibold px-3 py-1.5 rounded-full flex-shrink-0 leading-none border focus-ring"
            style={{ borderColor: "color-mix(in srgb, var(--primary) 28%, transparent)", color: SAGE }}>Pak dit op</motion.button>
        )}
        {/* Swipe-left already does this — this is the keyboard/reduced-motion
            fallback, since the gesture alone has no non-drag equivalent (#175). */}
        {canDismiss && handleDismiss && (
          <IconButton
            size={8}
            onClick={handleDismiss}
            label={`${task.title} niet vandaag`}
            icon={<X size={13} className="text-muted-foreground" aria-hidden="true" />}
          />
        )}
      </motion.div>
    </motion.div>
  );
});
