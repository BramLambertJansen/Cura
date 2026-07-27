import { memo } from "react";
import { motion, useTransform } from "motion/react";
import { Check, Trash2 } from "lucide-react";
import type { ShoppingItemView } from "../../data/types";
import { Checkbox, IconButton, SwipeReveal } from "./shared";
import { useSwipeRow } from "../lib/useSwipeRow";

/**
 * One open boodschappenlijst row inside a category card. An animated Checkbox
 * (the keyboard/screen-reader route, with its own "just checked" ripple) plus a
 * tappable title+aantal (+ optional description, a second muted line) that also
 * toggles, and swipe-right-to-check-off / swipe-left-to-delete via the shared
 * useSwipeRow mechanics — same two-directional reveal language as TaakRij (sage
 * check right, red trash left). Amount/unit/category/description are set in the
 * add sheet, not here — on a shopping trip the row stays calm and easy to hit
 * (CLAUDE.md §6).
 *
 * Rows carry no card chrome of their own: the parent category card supplies the
 * rounded border + shadow, and `isLast` drops the hairline divider on the final
 * row so the group reads as one card.
 */
export const BoodschapRij = memo(function BoodschapRij({
  item, onToggle, onDelete, isLast = false,
}: { item: ShoppingItemView; onToggle: () => void; onDelete: () => void; isLast?: boolean }) {
  const { x, dragProps } = useSwipeRow({ onToggle, onDismiss: onDelete });
  // The red "Verwijderen" reveal fades in as the row slides left — a label,
  // not the icon-in-circle badge SwipeReveal covers for the check side above,
  // so it stays its own bespoke JSX (see SwipeReveal's doc comment).
  const deleteRevealOpacity = useTransform(x, [-96, -24], [1, 0]);

  return (
    <div className="relative overflow-hidden">
      {/* The sage "afvinken" reveal fades in behind the row as it slides right. */}
      <SwipeReveal x={x} side="right" tone="primary" padding="pl-1" icon={<Check size={13} strokeWidth={3} className="text-white" aria-hidden="true" />} />

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
          className="flex-1 min-w-0 flex flex-col items-start text-left focus-ring rounded-lg -my-1 py-1">
          <span className="w-full flex items-center gap-2">
            <span className={`flex-1 min-w-0 truncate text-[0.9375rem] font-medium leading-snug ${item.checked ? "line-through" : ""}`}>
              {item.title}
            </span>
            {item.quantity && (
              <span className={`flex-shrink-0 text-xs text-muted-foreground ${item.checked ? "line-through" : ""}`}>
                {item.quantity}
              </span>
            )}
          </span>
          {item.description && (
            <span className={`w-full truncate text-xs text-muted-foreground/80 ${item.checked ? "line-through" : ""}`}>
              {item.description}
            </span>
          )}
        </motion.button>
        {/* Swipe-left already does this — this is the keyboard/reduced-motion
            fallback, since the gesture alone has no non-drag equivalent. */}
        <IconButton
          size={8}
          onClick={onDelete}
          label={`${item.title} verwijderen`}
          icon={<Trash2 size={13} className="text-muted-foreground" aria-hidden="true" />}
        />
      </motion.div>
    </div>
  );
});
