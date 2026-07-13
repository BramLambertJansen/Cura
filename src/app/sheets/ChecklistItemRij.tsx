import { useState } from "react";
import { motion } from "motion/react";
import { X } from "lucide-react";
import { spring } from "../lib/motion";
import { Checkbox } from "../components/shared";
import type { ChecklistItem } from "../../data/types";

/**
 * One subtask row inside a task's checklist (TaskFormFields, used by both
 * AddTaskSheet and EditTaskSheet). Unlike TaakDraftRij there's no
 * expand/collapse — just a checkbox, an inline-editable title, and a remove
 * button. Titles are editable in place (not fixed-once-added) since there's
 * no separate detail view to fix a typo in later.
 */
export function ChecklistItemRij({
  item, onToggle, onTitleChange, onRemove,
}: {
  item: ChecklistItem;
  onToggle: () => void;
  onTitleChange: (title: string) => void;
  onRemove: () => void;
}) {
  const [title, setTitle] = useState(item.title);
  return (
    <motion.div layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} transition={spring}
      className="flex items-center gap-2.5 px-3 py-2 rounded-2xl" style={{ background: "var(--secondary)" }}>
      <Checkbox
        checked={item.checked}
        onToggle={onToggle}
        size="md"
        label={item.checked ? `${item.title} als niet gedaan markeren` : `${item.title} afvinken`}
      />
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => {
          const t = title.trim();
          if (t && t !== item.title) onTitleChange(t);
          else setTitle(item.title);
        }}
        aria-label="Titel van checklist-item"
        className="flex-1 min-w-0 bg-transparent text-sm text-foreground outline-none"
      />
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        aria-label="Checklist-item verwijderen"
        className="w-5 h-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0 focus-ring">
        <X size={9} className="text-muted-foreground" aria-hidden="true" />
      </motion.button>
    </motion.div>
  );
}
