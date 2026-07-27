import { memo } from "react";
import { motion, useTransform } from "motion/react";
import { Check, Trash2 } from "lucide-react";
import type { ShoppingItemView } from "../../data/types";
import { SAGE } from "../lib/constants";
import { Checkbox } from "./shared";
import { useSwipeRow } from "../lib/useSwipeRow";

/**
 * One open boodschappenlijst row inside a category card. An animated Checkbox
 * (the keyboard/screen-reader route, with its own "just checked" ripple) plus a
 * tappable title+aantal that also toggles, and swipe-right-to-check-off /
 * swipe-left-to-delete via the shared useSwipeRow mechanics — same two-directional
 * reveal language as TaakRij (sage check right, red trash left). Amount/unit/
 * category are set in the add sheet, not here — on a shopping trip the row stays
 * calm and easy to hit (CLAUDE.md §6).
 *
 * Rows carry no card chrome of their own: the parent category card supplies the
 * rounded border + shadow, and `isLast` drops the hairline divider on the final
 * row so the group reads as one card.
 */
export const BoodschapRij = memo(function BoodschapRij({
  item, onToggle, onDelete, isLast = false,
}: { item: ShoppingItemView; onToggle: () => void; onDelete: () => void; isLast?: boolean }) {
  const { x, dragProps } = useSwipeRow({ onToggle, onDismiss: onDelete });
  // The sage "afvinken" reveal fades in behind the row as it slides right...
  const checkRevealOpacity = useTransform(x, [10, 48], [0, 1]);
  const checkRevealScale = useTransform(x, [10, 60], [0.6, 1]);
  // ...and the red "Verwijderen" reveal fades in as it slides left.
  const deleteRevealOpacity = useTransform(x, [-96, -24], [1, 0]);

  return (
    <div className="relative overflow-hidden">
      <div aria-hidden="true" className="absolute inset-0 flex items-center pl-1 pointer-events-none">
        <motion.div
          style={{ opacity: checkRevealOpacity, scale: checkRevealScale }}
          className="w-7 h-7 rounded-full flex items-center justify-center">
          <span className="w-full h-full rounded-full flex items-center justify-center" style={{ background: SAGE }}>
            <Check size={13} strokeWidth={3} className="text-white" aria-hidden="true" />
          </span>
        </motion.div>
      </div>

      <motion.div
        aria-hidden="true"
        style={{ opacity: deleteRevealOpacity, background: "color-mix(in srgb, var(--destructive) 12%, transparent)" }}
        className="absolute inset-0 flex items-center justify-end">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--destructive)" }}>
          Verwijderen
          <Trash2 size={13} strokeWidth={2.4} aria-hidden="true" />
        </span>
      </motion.div>

      <motion.div
        {...dragProps}
        style={{ x, touchAction: "pan-y" }}
        className={`relative z-10 flex items-center gap-3 bg-card py-3 ${isLast ? "" : "border-b border-border/60"}`}>
        <Checkbox
          size="md"
          checked={item.checked}
          onToggle={onToggle}
          label={item.checked ? `${item.title} terugzetten` : `${item.title} afvinken`}
        />
        <motion.button
          type="button"
          onClick={onToggle}
          aria-label={item.checked ? `${item.title} terugzetten` : `${item.title} afvinken`}
          animate={{ color: item.checked ? "var(--muted-foreground)" : "var(--foreground)" }}
          className="flex-1 min-w-0 flex items-center gap-2 text-left focus-ring rounded-lg -my-1 py-1">
          <span className={`flex-1 min-w-0 truncate text-[0.9375rem] font-medium leading-snug ${item.checked ? "line-through" : ""}`}>
            {item.title}
          </span>
          {item.quantity && (
            <span className={`flex-shrink-0 text-xs text-muted-foreground ${item.checked ? "line-through" : ""}`}>
              {item.quantity}
            </span>
          )}
        </motion.button>
      </motion.div>
    </div>
  );
});
