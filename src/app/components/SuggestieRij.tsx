import { memo } from "react";
import { motion } from "motion/react";
import { Plus, X } from "lucide-react";
import type { TaskView } from "../../data/types";
import { IconButton } from "./shared";

/** Soft, non-alarming reason a task surfaced as a suggestion — never an exact day count. */
function suggestionReason(task: TaskView): string {
  if (task.dueHint === "Waarschijnlijk weer toe") return "Waarschijnlijk weer toe";
  if (task.wekkerLabel) return "Staat met een wekker";
  return "Past goed tussendoor";
}

/**
 * A single "misschien handig"-suggestion — plan it or wave it off, both
 * reversible. Sits directly inside the "Misschien handig" group-card (see
 * VandaagPage) without its own shadow/border — a flatter --card fill nested
 * in that card's warmer --card-active, the same nesting the dagdeel-tijdlijn
 * rows use.
 */
export const SuggestieRij = memo(function SuggestieRij({
  task, onPlan, onNietVandaag,
}: {
  task: TaskView;
  onPlan: () => void;
  onNietVandaag: () => void;
}) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22 }}
      className="bg-card rounded-[0.875rem] px-3.5 py-3 flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-[0.9375rem] font-medium text-foreground leading-snug">{task.title}</p>
        {/* Honest reason first, then room · duration — only what exists. Free to
            wrap onto a second line rather than truncate; it's short enough that
            it rarely needs to. */}
        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
          {suggestionReason(task)}
          {task.room && ` · ${task.room}`}
          {task.duration && ` · ${task.duration}`}
        </p>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <IconButton
          tone="primary"
          size={9}
          onClick={onPlan}
          label={`Zet ${task.title} op mijn dag`}
          icon={<Plus size={18} aria-hidden="true" />}
        />
        <IconButton
          tone="secondary"
          size={8}
          onClick={onNietVandaag}
          label={`${task.title}: niet vandaag`}
          icon={<X size={16} className="text-muted-foreground" aria-hidden="true" />}
        />
      </div>
    </motion.div>
  );
});
