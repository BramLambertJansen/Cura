import { memo } from "react";
import { motion } from "motion/react";
import { Trash2 } from "lucide-react";
import type { ShoppingItemView } from "../../data/types";
import { Card, Checkbox, IconButton } from "./shared";

/**
 * A single boodschappenlijst row — checkbox + title/aantal + direct delete.
 * No swipe, no tap-to-edit (unlike TaakRij): a shopping item is a disposable
 * one-field checklist entry, trivial to re-add, so a confirm-less delete and
 * no edit affordance keep it light rather than mirroring the full task row.
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
        <motion.p
          animate={{ color: item.checked ? "var(--muted-foreground)" : "var(--foreground)" }}
          className={`flex-1 min-w-0 text-[0.9375rem] font-medium leading-snug truncate ${item.checked ? "line-through" : ""}`}>
          {item.title}
          {item.quantity && <span className="text-xs text-muted-foreground font-normal"> · {item.quantity}</span>}
        </motion.p>
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
