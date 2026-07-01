import { memo } from "react";
import { motion } from "motion/react";
import { Bell, RefreshCw } from "lucide-react";
import type { TaskView } from "../../data/types";
import { SAGE, SHADOW } from "../lib/constants";
import { intervalLabel } from "../lib/format";
import { Checkbox } from "./shared";

export const TaakRij = memo(function TaakRij({
  task, onToggle, showClaim = false, onClaim, onEdit,
}: {
  task: TaskView;
  onToggle: () => void;
  showClaim?: boolean;
  onClaim?: () => void;
  onEdit?: () => void;
}) {
  const claimed = !!task.claimedBy;
  return (
    <motion.div layout
      animate={{ opacity: task.done ? 0.48 : 1 }}
      transition={{ duration: 0.28 }}
      onClick={onEdit}
      role={onEdit ? "button" : undefined}
      tabIndex={onEdit ? 0 : undefined}
      onKeyDown={onEdit ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onEdit(); } } : undefined}
      aria-label={onEdit ? `${task.title} bewerken` : undefined}
      className={`flex items-center gap-3.5 bg-card rounded-2xl px-4 py-[0.9rem] border border-border/50 ${onEdit ? "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--primary)_50%,transparent)]" : ""}`}
      style={{
        boxShadow: SHADOW,
        borderLeft: !task.done && !claimed ? `2.5px solid color-mix(in srgb, var(--primary) 18%, transparent)` : "2.5px solid transparent",
      }}>
      <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
        <Checkbox checked={task.done} onToggle={onToggle} label={task.done ? `${task.title} als niet gedaan markeren` : `${task.title} afvinken`} />
      </span>
      <div className="flex-1 min-w-0">
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
      </div>
      {showClaim && !task.done && !claimed && onClaim && (
        <motion.button whileTap={{ scale: 0.9 }}
          onClick={(e) => { e.stopPropagation(); onClaim(); }}
          className="text-xs font-semibold px-3 py-1.5 rounded-full flex-shrink-0 leading-none"
          style={{ background: "color-mix(in srgb, var(--primary) 9%, transparent)", color: SAGE }}>Ik pak dit</motion.button>
      )}
    </motion.div>
  );
});
