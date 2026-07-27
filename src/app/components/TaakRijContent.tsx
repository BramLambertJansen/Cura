import { motion } from "motion/react";
import { Bell, ListChecks, RefreshCw } from "lucide-react";
import type { TaskView } from "../../data/types";
import { SAGE } from "../lib/constants";
import { intervalLabel } from "../lib/format";

/**
 * Title, optional description, and the interval/wekker/checklist/bezig/
 * claimed badge row — identical in TaakRij and TijdlijnTaakRij (CLAUDE.md
 * Swipe & verversen used to warn "always update both"; this is the shared
 * source instead). Both wrap it in their own outer card chrome.
 */
export function TaakRijContent({ task }: { task: TaskView }) {
  const claimed = !!task.claimedBy;
  return (
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
        {task.checklistProgress && (
          <span className="flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
            style={{ background: "color-mix(in srgb, var(--primary) 9%, transparent)", color: SAGE }}>
            <ListChecks size={8} aria-hidden="true" /> {task.checklistProgress.done}/{task.checklistProgress.total}
          </span>
        )}
        {task.status === "bezig" && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
            style={{ background: "color-mix(in srgb, var(--accent) 30%, transparent)", color: "var(--muted-foreground)" }}>
            Bezig
          </span>
        )}
        {claimed && !task.done && <span className="text-xs font-semibold ml-0.5" style={{ color: SAGE }}>{task.claimedBy} pakt dit</span>}
      </div>
    </>
  );
}
