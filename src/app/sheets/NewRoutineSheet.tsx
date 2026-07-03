import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, ChevronLeft } from "lucide-react";
import { useCuraStore } from "../../stores/useCuraStore";
import { SAGE, TRIGGER_OPTIONS } from "../lib/constants";
import { spring } from "../lib/motion";
import { cadenceAndLabel } from "../lib/format";
import { Sheet, SheetHeader, VeldInput, DubbelKnop, KeuzeChip, IconButton, TaakToevoegRij } from "../components/shared";
import { TaakDraftRij, type TaakDraftItem } from "./TaakDraftRij";

export function NewRoutineSheet({ onClose }: { onClose: () => void }) {
  const createBundle = useCuraStore((s) => s.createBundle);
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState("");
  const [input, setInput] = useState("");
  const [tasks, setTasks] = useState<TaakDraftItem[]>([]);
  const [saved, setSaved] = useState(false);

  function addTask() {
    if (!input.trim()) return;
    setTasks((p) => [...p, { key: crypto.randomUUID(), title: input.trim() }]);
    setInput("");
  }

  function save() {
    const tLabel = TRIGGER_OPTIONS.find((t) => t.id === trigger)?.label ?? trigger;
    const { cadence, windowLabel } = cadenceAndLabel(trigger);
    createBundle({ name: name.trim(), trigger: tLabel, cadence, windowLabel }, tasks);
    setSaved(true);
    setTimeout(onClose, 1500);
  }

  return (
    <Sheet onClose={onClose}>
      <div className="flex items-center gap-1.5 justify-center mb-7" aria-hidden="true">
        {[0, 1].map((i) => (
          <motion.div key={i} animate={{ width: step === i ? "28px" : "8px", backgroundColor: step >= i ? SAGE : "var(--muted)" }} transition={spring} className="h-2 rounded-full" />
        ))}
      </div>
      <AnimatePresence mode="wait">
        {saved ? (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={spring}
            role="status" aria-live="polite"
            className="flex flex-col items-center gap-4 py-10">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 26, delay: 0.1 }}
              className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: SAGE, boxShadow: `0 6px 24px color-mix(in srgb, var(--primary) 38%, transparent)` }}>
              <Check size={28} strokeWidth={2.5} className="text-white" />
            </motion.div>
            <p className="text-lg font-medium text-center font-display">"{name}" aangemaakt</p>
            <p className="text-sm text-muted-foreground text-center">Je vindt de routine terug in het overzicht.</p>
          </motion.div>
        ) : step === 0 ? (
          <motion.div key="s0" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.18 }}>
            <SheetHeader title="Naam & moment" onClose={onClose} />
            <VeldInput autoFocus value={name} onChange={setName} placeholder="Bijv. Ochtendroutine" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 mt-6">Wanneer</p>
            <div className="flex flex-wrap gap-2 mb-8">
              {TRIGGER_OPTIONS.map((opt) => (
                <KeuzeChip key={opt.id} selected={trigger === opt.id} onClick={() => setTrigger(opt.id)}>
                  {opt.label}
                </KeuzeChip>
              ))}
            </div>
            <DubbelKnop onCancel={onClose} onConfirm={() => setStep(1)} label="Volgende" disabled={!name.trim() || !trigger} />
          </motion.div>
        ) : (
          <motion.div key="s1" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.18 }}>
            <div className="flex items-center gap-2 mb-7">
              <IconButton size={8} onClick={() => setStep(0)} label="Terug naar naam en moment" icon={<ChevronLeft size={16} className="text-muted-foreground" aria-hidden="true" />} />
              <h3 className="text-xl font-medium text-foreground font-display">Taken toevoegen</h3>
            </div>
            <div className="space-y-2 mb-4 max-h-64 overflow-y-auto scrollbar-hide">
              <AnimatePresence>
                {tasks.map((t, i) => (
                  <TaakDraftRij
                    key={t.key}
                    draft={t}
                    onChange={(patch) => setTasks((p) => p.map((d, j) => (j === i ? { ...d, ...patch } : d)))}
                    onRemove={() => setTasks((p) => p.filter((_, j) => j !== i))}
                  />
                ))}
              </AnimatePresence>
            </div>
            <TaakToevoegRij value={input} onChange={setInput} onAdd={addTask} placeholder="Taak omschrijving…" />
            <DubbelKnop onCancel={onClose} onConfirm={save} label="Opslaan" disabled={tasks.length === 0} />
          </motion.div>
        )}
      </AnimatePresence>
    </Sheet>
  );
}
