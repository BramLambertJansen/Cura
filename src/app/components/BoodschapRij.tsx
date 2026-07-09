import { memo } from "react";
import { motion } from "motion/react";
import { Trash2 } from "lucide-react";
import type { ShoppingItemView } from "../../data/types";
import { Card, Checkbox, IconButton } from "./shared";

/**
 * A single boodschappenlijst row: checkbox + title/aantal + direct delete.
 * The title area toggles too, because on a shopping trip the whole row should
 * feel easy to hit without turning delete into a risky accidental action.
 */
export const BoodschapRij = memo(function BoodschapRij({
  item, onToggle, onDelete,
}: { item: ShoppingItemView; onToggle: () => void; onDelete: () => void }) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      <Card tone={item.checked ? "default" : "active"} className="flex items-center gap-3.5 px-4 py-3.5">
        <Checkbox
          checked={item.checked}
          onToggle={onToggle}
          label={item.checked ? `${item.title} terugzetten` : `${item.title} afvinken`}
        />
        <motion.button
          type="button"
          onClick={onToggle}
          aria-label={item.checked ? `${item.title} terugzetten` : `${item.title} afvinken`}
          animate={{ color: item.checked ? "var(--muted-foreground)" : "var(--foreground)" }}
          className="flex-1 min-w-0 text-left focus-ring rounded-xl -my-1 py-1">
          <span className={`block text-[0.9375rem] font-medium leading-snug truncate ${item.checked ? "line-through" : ""}`}>
            {item.title}
          </span>
          {item.quantity && (
            <span className={`block text-xs text-muted-foreground font-normal leading-snug truncate ${item.checked ? "line-through" : ""}`}>
              {item.quantity}
            </span>
          )}
        </motion.button>
        <IconButton
          size={8}
          onClick={onDelete}
          label={`${item.title} verwijderen`}
          icon={<Trash2 size={13} className="text-muted-foreground" aria-hidden="true" />}
        />
      </Card>
    </motion.div>
  );
});
