import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, ChevronDown, X } from "lucide-react";
import { SAGE } from "../lib/constants";
import { spring } from "../lib/motion";
import { VeldTextarea } from "../components/shared";
import type { TaakDraft } from "../../stores/useCuraStore";

export interface TaakDraftItem extends TaakDraft {
  key: string;
}

/**
 * One task row while composing/editing a routine (NewRoutineSheet,
 * EditRoutineSheet). Tap the row to reveal duur + beschrijving for that
 * specific task — the quick-add-by-title flow itself stays untouched.
 */
export function TaakDraftRij({
  draft, onChange, onRemove,
}: {
  draft: TaakDraftItem;
  onChange: (patch: Partial<TaakDraft>) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} transition={spring}
      className="rounded-2xl overflow-hidden" style={{ background: "var(--secondary)" }}>
      <div
        onClick={() => setOpen((v) => !v)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen((v) => !v); } }}
        aria-expanded={open}
        aria-label={`${draft.title}, details ${open ? "inklappen" : "uitklappen"}`}
        className="flex items-center gap-3 px-4 py-3 cursor-pointer focus-ring focus-visible:ring-inset">
        <Check size={12} strokeWidth={3} style={{ color: SAGE, flexShrink: 0 }} aria-hidden="true" />
        <span className="flex-1 text-sm text-foreground truncate">{draft.title}</span>
        {draft.durationMin && (
          <span className="text-[10px] font-medium text-muted-foreground flex-shrink-0">{draft.durationMin} min</span>
        )}
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ type: "spring", stiffness: 400, damping: 30 }} className="flex-shrink-0" aria-hidden="true">
          <ChevronDown size={14} className="text-muted-foreground" />
        </motion.div>
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          aria-label={`${draft.title} verwijderen`}
          className="w-5 h-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0 focus-ring">
          <X size={9} className="text-muted-foreground" aria-hidden="true" />
        </motion.button>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 360, damping: 34 }} className="overflow-hidden">
            <div className="px-4 pb-3.5 pt-1 space-y-2.5">
              <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl" style={{ background: "var(--card)" }}>
                <input
                  type="number" min={1} max={480}
                  value={draft.durationMin ?? ""}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    onChange({ durationMin: isNaN(v) || v <= 0 ? undefined : v });
                  }}
                  placeholder="Duur, bijv. 10"
                  aria-label={`Duur van ${draft.title} in minuten`}
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none"
                />
                <span className="text-xs text-muted-foreground flex-shrink-0">min</span>
              </div>
              <VeldTextarea
                value={draft.description ?? ""}
                onChange={(v) => onChange({ description: v || undefined })}
                placeholder="Beschrijving (optioneel)"
                ariaLabel={`Beschrijving van ${draft.title}`}
                rows={2}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
