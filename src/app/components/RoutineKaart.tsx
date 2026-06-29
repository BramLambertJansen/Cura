import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, ChevronRight, Pencil } from "lucide-react";
import type { RoutineView } from "../../data/types";
import { SAGE, SHADOW } from "../lib/constants";
import { Checkbox, RingProgress } from "./shared";

export function RoutineKaartCompact({
  routine, onToggleTask,
}: { routine: RoutineView; onToggleTask: (taskId: string) => void }) {
  const done = routine.tasks.filter((t) => t.done).length;
  const total = routine.tasks.length;
  return (
    <div className="bg-card rounded-2xl px-4 py-4 border border-border/60" style={{ boxShadow: SHADOW }}>
      <div className="flex items-center gap-3.5 mb-3.5">
        <RingProgress value={total > 0 ? done / total : 0} size={40} stroke={3} />
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">{routine.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5" style={{ fontStyle: "italic", fontFamily: "Lora,Georgia,serif" }}>{routine.trigger}</p>
        </div>
        <span className="text-xs tabular-nums font-medium text-muted-foreground">{done}/{total}</span>
      </div>
      <div className="space-y-2.5">
        {routine.tasks.map((t) => (
          <motion.button key={t.id} whileTap={{ scale: 0.97 }} onClick={() => onToggleTask(t.id)} className="flex items-center gap-2.5 w-full">
            <div className="w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center transition-all duration-200"
              style={{ background: t.done ? SAGE : "transparent", borderColor: t.done ? SAGE : "color-mix(in srgb, var(--outline-color) 32%, transparent)" }}>
              {t.done && <Check size={8} strokeWidth={3.5} className="text-white" />}
            </div>
            <span className={`text-xs leading-snug text-left flex-1 ${t.done ? "line-through text-muted-foreground" : "text-foreground"}`}>{t.title}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

export function RoutineKaart({
  routine, onToggleTask, onEdit,
}: { routine: RoutineView; onToggleTask: (taskId: string) => void; onEdit: () => void }) {
  const [open, setOpen] = useState(false);
  const done = routine.tasks.filter((t) => t.done).length;
  const total = routine.tasks.length;
  return (
    <div className="bg-card rounded-3xl border border-border/60 overflow-hidden" style={{ boxShadow: SHADOW }}>
      <motion.button
        whileTap={{ backgroundColor: "rgba(0,0,0,0.02)" }}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={`${routine.name} ${open ? "inklappen" : "uitklappen"}`}
        className="w-full flex items-center gap-4 text-left transition-colors px-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color-mix(in_srgb,var(--primary)_40%,transparent)]"
        style={{ paddingTop: "1.1rem", paddingBottom: "1.1rem" }}>
        <RingProgress value={total > 0 ? done / total : 0} size={50} stroke={4} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-foreground">{routine.name}</p>
            {done === total && done > 0 && (
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 26 }}
                className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)", color: SAGE }}>Klaar</motion.span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{routine.trigger}</p>
          <p className="text-xs mt-1 leading-snug" style={{ color: "var(--muted-foreground)", fontStyle: "italic", fontFamily: "Lora,Georgia,serif" }}>
            {routine.doneInWindow} van {routine.windowSize} {routine.windowLabel} — {routine.hint.toLowerCase()}
          </p>
        </div>
        <motion.div animate={{ rotate: open ? 90 : 0 }} transition={{ type: "spring", stiffness: 400, damping: 30 }}>
          <ChevronRight size={16} className="text-muted-foreground flex-shrink-0" />
        </motion.div>
      </motion.button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ type: "spring", stiffness: 360, damping: 34 }} className="overflow-hidden">
            <div className="px-5 pb-4 pt-2 border-t border-border/40 space-y-3.5">
              {routine.tasks.map((t) => (
                <motion.div key={t.id} whileTap={{ scale: 0.97 }} onClick={() => onToggleTask(t.id)} className="flex items-center gap-3 cursor-pointer">
                  <Checkbox checked={t.done} onToggle={() => onToggleTask(t.id)} size="md" label={t.title} />
                  <span className={`text-sm text-left flex-1 ${t.done ? "line-through text-muted-foreground" : "text-foreground"}`}>{t.title}</span>
                </motion.div>
              ))}
              <div className="pt-1 border-t border-border/30">
                <motion.button
                  onClick={onEdit}
                  whileTap={{ scale: 0.96 }}
                  aria-label={`${routine.name} bewerken`}
                  className="flex items-center gap-2 text-xs font-medium py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--primary)_50%,transparent)] rounded-lg px-1"
                  style={{ color: "var(--muted-foreground)" }}>
                  <Pencil size={12} aria-hidden="true" />
                  Routine bewerken
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
