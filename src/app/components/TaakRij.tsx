import { memo } from "react";
import { motion } from "motion/react";
import { RefreshCw } from "lucide-react";
import type { TaskView } from "../../data/types";
import { SAGE, SHADOW } from "../lib/constants";
import { intervalLabel } from "../lib/format";
import { Checkbox } from "./shared";

export const TaakRij = memo(function TaakRij({
  task, onToggle, showClaim = false, onClaim,
}: { task: TaskView; onToggle: () => void; showClaim?: boolean; onClaim?: () => void }) {
  const claimed = !!task.claimedBy;
  return (
    <motion.div layout
      animate={{ opacity: task.done ? 0.48 : 1 }}
      transition={{ duration: 0.28 }}
      className="flex items-center gap-3.5 bg-card rounded-2xl px-4 py-[0.9rem] border border-border/50"
      style={{
        boxShadow: SHADOW,
        borderLeft: !task.done && !claimed ? `2.5px solid color-mix(in srgb, var(--primary) 18%, transparent)` : "2.5px solid transparent",
      }}>
      <Checkbox checked={task.done} onToggle={onToggle} label={task.done ? `${task.title} als niet gedaan markeren` : `${task.title} afvinken`} />
      <div className="flex-1 min-w-0">
        <motion.p animate={{ color: task.done ? "var(--muted-foreground)" : "var(--foreground)" }}
          className={`text-[0.9375rem] font-medium leading-snug ${task.done ? "line-through" : ""}`}>{task.title}</motion.p>
        <div className="flex items-center gap-1.5 mt-[0.3rem] flex-wrap">
          {task.room && <span className="text-xs text-muted-foreground">{task.room}</span>}
          {task.duration && <span className="text-xs text-muted-foreground opacity-50">· {task.duration}</span>}
          {task.intervalDays && (
            <span className="flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
              style={{ background: "color-mix(in srgb, var(--primary) 9%, transparent)", color: SAGE }}>
              <RefreshCw size={8} aria-hidden="true" /> {intervalLabel(task.intervalDays)}
            </span>
          )}
          {claimed && !task.done && <span className="text-xs font-semibold ml-0.5" style={{ color: SAGE }}>{task.claimedBy} pakt dit</span>}
        </div>
      </div>
      {showClaim && !task.done && !claimed && onClaim && (
        <motion.button whileTap={{ scale: 0.9 }} onClick={onClaim}
          className="text-xs font-semibold px-3 py-1.5 rounded-full flex-shrink-0 leading-none"
          style={{ background: "color-mix(in srgb, var(--primary) 9%, transparent)", color: SAGE }}>Ik pak dit</motion.button>
      )}
    </motion.div>
  );
});
