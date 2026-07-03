import { memo, useRef } from "react";
import { motion, useMotionValue, useTransform, useReducedMotion, type PanInfo } from "motion/react";
import { Bell, Check, RefreshCw, RotateCcw, X } from "lucide-react";
import type { TaskView } from "../../data/types";
import { SAGE, SHADOW } from "../lib/constants";
import { intervalLabel } from "../lib/format";
import { CARD_BORDER, Checkbox } from "./shared";

// Swipe-right-to-toggle: pointer distance (px) that commits the gesture, or a
// shorter-but-fast flick. The card itself follows at dragElastic's pace, so
// these are finger distances, not visual card offsets.
const SWIPE_COMMIT_DISTANCE = 96;
const SWIPE_FLICK_DISTANCE = 48;
const SWIPE_FLICK_VELOCITY = 650;
const SWIPE_LEFT_COMMIT_DISTANCE = 96;

export const TaakRij = memo(function TaakRij({
  task, onToggle, showClaim = false, onClaim, onUnclaim, onEdit, onDismiss,
}: {
  task: TaskView;
  onToggle: () => void;
  showClaim?: boolean;
  onClaim?: () => void;
  onUnclaim?: () => void;
  onEdit?: () => void;
  onDismiss?: () => void;
}) {
  const claimed = !!task.claimedBy;
  const reduceMotion = useReducedMotion();
  // Visual x of the card while swiping; the sage check behind it fades/grows in step.
  const x = useMotionValue(0);
  const revealOpacity = useTransform(x, [10, 48], [0, 1]);
  const revealScale = useTransform(x, [10, 60], [0.6, 1]);

  // Releasing a drag still fires a click on whatever child the pointer ends over
  // (the edit button) — swallow that one click so a swipe never doubles as a tap.
  const wasDragged = useRef(false);

  function handleDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    const commitRight =
      info.offset.x > SWIPE_COMMIT_DISTANCE ||
      (info.offset.x > SWIPE_FLICK_DISTANCE && info.velocity.x > SWIPE_FLICK_VELOCITY);
    const commitLeft = info.offset.x < -SWIPE_LEFT_COMMIT_DISTANCE;

    if (commitRight) onToggle();
    if (commitLeft && onDismiss) onDismiss();

    // The synthetic click dispatches right after pointerup; clear the flag a tick later.
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
        {claimed && !task.done && <span className="text-xs font-semibold ml-0.5" style={{ color: SAGE }}>{task.claimedBy} pakt dit</span>}
      </div>
    </>
  );
  return (
    <motion.div layout animate={{ opacity: task.done ? 0.48 : 1 }} transition={{ duration: 0.28 }} className="relative">
      {/* Revealed behind the card while swiping right — the same visual language as the checked checkbox. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-2xl flex items-center pl-5 pointer-events-none"
        style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)" }}
      >
        <motion.div
          style={{ opacity: revealOpacity, scale: revealScale }}
          className="w-7 h-7 rounded-full flex items-center justify-center"
        >
          <span className="w-full h-full rounded-full flex items-center justify-center" style={{ background: SAGE }}>
            {task.done
              ? <RotateCcw size={13} strokeWidth={2.5} className="text-white" />
              : <Check size={13} strokeWidth={3} className="text-white" />}
          </span>
        </motion.div>
      </div>
      {onDismiss && (
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-2xl flex items-center justify-end pr-5 pointer-events-none"
          style={{ background: "color-mix(in srgb, var(--destructive) 12%, transparent)" }}
        >
          <motion.div
            style={{ opacity: useTransform(x, [-48, -10], [1, 0]), scale: useTransform(x, [-60, -10], [1, 0.6]) }}
            className="w-7 h-7 rounded-full flex items-center justify-center"
          >
            <span className="w-full h-full rounded-full flex items-center justify-center" style={{ background: "var(--destructive)" }}>
              <X size={13} strokeWidth={3} className="text-white" />
            </span>
          </motion.div>
        </div>
      )}
      <motion.div
        // Swipe right to toggle — an enhancement on top of the checkbox, never a replacement
        // (§6: the checkbox stays the keyboard/screenreader path). touchAction pan-y leaves
        // vertical scrolling native; the drag only owns horizontal movement.
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
        <Checkbox checked={task.done} onToggle={onToggle} label={task.done ? `${task.title} als niet gedaan markeren` : `${task.title} afvinken`} />
        {onEdit ? (
          <button
            onClick={onEdit}
            aria-label={`${task.title} bewerken`}
            className="flex-1 min-w-0 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--primary)_50%,transparent)] rounded-lg">
            {content}
          </button>
        ) : (
          <div className="flex-1 min-w-0">{content}</div>
        )}
        {showClaim && !task.done && !claimed && onClaim && (
          <motion.button whileTap={{ scale: 0.9 }}
            onClick={onClaim}
            className="text-xs font-semibold px-3 py-1.5 rounded-full flex-shrink-0 leading-none"
            style={{ background: "color-mix(in srgb, var(--primary) 9%, transparent)", color: SAGE }}>Ik pak dit</motion.button>
        )}
        {showClaim && !task.done && claimed && onUnclaim && (
          <motion.button whileTap={{ scale: 0.9 }}
            onClick={onUnclaim}
            aria-label={`Claim van ${task.title} loslaten`}
            className="text-xs font-semibold px-3 py-1.5 rounded-full flex-shrink-0 leading-none border"
            style={{ borderColor: "color-mix(in srgb, var(--outline-color) 24%, transparent)", color: "var(--muted-foreground)" }}>Laat los</motion.button>
        )}
      </motion.div>
    </motion.div>
  );
});
