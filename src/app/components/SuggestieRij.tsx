import { memo } from "react";
import { motion } from "motion/react";
import { Plus, X } from "lucide-react";
import type { TaskView } from "../../data/types";
import { SAGE } from "../lib/constants";
import { Card, IconButton } from "./shared";

/** Soft, non-alarming reason a task surfaced as a suggestion — never an exact day count. */
function suggestionReason(task: TaskView): string {
  if (task.dueHint === "Waarschijnlijk weer toe") return "Waarschijnlijk weer toe";
  if (task.wekkerLabel) return "Staat met een wekker";
  return "Past goed tussendoor";
}

/** A single "misschien handig"-suggestion — plan it or wave it off, both reversible. */
export const SuggestieRij = memo(function SuggestieRij({
  task, onPlan, onNietVandaag,
}: {
  task: TaskView;
  onPlan: () => void;
  onNietVandaag: () => void;
}) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22 }}>
      <Card tone="active" className="px-4 py-3.5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.9375rem] font-medium text-foreground leading-snug">{task.title}</p>
          {/* One calm line: honest reason first, then room · duration — only what exists. */}
          <p className="text-xs mt-1 leading-snug flex flex-wrap items-center gap-x-1.5">
            <span className="font-display italic" style={{ color: SAGE }}>{suggestionReason(task)}</span>
            {task.room && <span className="text-muted-foreground">· {task.room}</span>}
            {task.duration && <span className="text-muted-foreground opacity-60">· {task.duration}</span>}
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <IconButton
            tone="secondary"
            size={8}
            onClick={onNietVandaag}
            label={`${task.title}: niet vandaag`}
            icon={<X size={16} className="text-muted-foreground" aria-hidden="true" />}
          />
          <IconButton
            tone="primary"
            size={9}
            onClick={onPlan}
            label={`Zet ${task.title} op mijn dag`}
            icon={<Plus size={18} aria-hidden="true" />}
          />
        </div>
      </Card>
    </motion.div>
  );
});
