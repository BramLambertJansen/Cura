import { memo } from "react";
import { motion } from "motion/react";
import type { TaskView } from "../../data/types";
import { SAGE, SHADOW } from "../lib/constants";
import { Card } from "./shared";

/** Soft, non-alarming reason a task surfaced as a suggestion — never an exact day count. */
function suggestionReason(task: TaskView): string {
  if (task.dueHint === "Waarschijnlijk weer toe") return "Misschien handig vandaag";
  if (task.wekkerLabel) return "Staat met een wekker";
  return "Past goed tussendoor";
}

/** A single "misschien handig vandaag"-suggestion — plan it or wave it off, both reversible. */
export const SuggestieRij = memo(function SuggestieRij({
  task, onPlan, onNietVandaag,
}: {
  task: TaskView;
  onPlan: () => void;
  onNietVandaag: () => void;
}) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22 }}>
      <Card className="px-4 py-3.5">
        <div>
          <p className="text-[0.9375rem] font-medium text-foreground leading-snug">{task.title}</p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {task.room && <span className="text-xs text-muted-foreground">{task.room}</span>}
            {task.duration && <span className="text-xs text-muted-foreground opacity-50">· {task.duration}</span>}
          </div>
          <p className="text-xs mt-1.5" style={{ color: SAGE, fontFamily: "Lora,Georgia,serif", fontStyle: "italic" }}>{suggestionReason(task)}</p>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onPlan}
            className="flex-1 py-2 rounded-full text-xs font-semibold text-white transition-[box-shadow,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--primary)_50%,transparent)] focus-visible:ring-offset-2"
            style={{ background: "var(--gradient-primary)", boxShadow: `0 3px 12px color-mix(in srgb, var(--primary) 24%, transparent)` }}>
            Zet op mijn dag
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onNietVandaag}
            aria-label={`${task.title}: niet vandaag`}
            className="px-3.5 py-2 rounded-full text-xs font-medium text-muted-foreground border border-border/70 transition-[background-color,transform] hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--primary)_50%,transparent)] focus-visible:ring-offset-2"
            style={{ boxShadow: SHADOW }}>
            Niet vandaag
          </motion.button>
        </div>
      </Card>
    </motion.div>
  );
});
