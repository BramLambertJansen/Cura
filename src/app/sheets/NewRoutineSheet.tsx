import { useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, ChevronLeft, Plus } from "lucide-react";
import { useCuraStore } from "../../stores/useCuraStore";
import { SAGE, TRIGGER_OPTIONS } from "../lib/constants";
import { spring } from "../lib/motion";
import { cadenceAndLabel } from "../lib/format";
import { Sheet, SheetHeader, VeldInput, DubbelKnop, fieldBorderColor, fieldBoxShadow } from "../components/shared";
import { TaakDraftRij, type TaakDraftItem } from "./TaakDraftRij";

export function NewRoutineSheet({ onClose }: { onClose: () => void }) {
  const createBundle = useCuraStore((s) => s.createBundle);
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState("");
  const [input, setInput] = useState("");
  const [inputActive, setInputActive] = useState(false);
  const [tasks, setTasks] = useState<TaakDraftItem[]>([]);
  const [saved, setSaved] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  function addTask() {
    if (!input.trim()) return;
    setTasks((p) => [...p, { key: crypto.randomUUID(), title: input.trim() }]);
    setInput("");
    ref.current?.focus();
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
      <div className="flex items-center gap-1.5 justify-center mb-7">
        {[0, 1].map((i) => (
          <motion.div key={i} animate={{ width: step === i ? "28px" : "8px", backgroundColor: step >= i ? SAGE : "var(--muted)" }} transition={spring} className="h-2 rounded-full" />
        ))}
      </div>
      <AnimatePresence mode="wait">
        {saved ? (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={spring}
            className="flex flex-col items-center gap-4 py-10">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 26, delay: 0.1 }}
              className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: SAGE, boxShadow: `0 6px 24px color-mix(in srgb, var(--primary) 38%, transparent)` }}>
              <Check size={28} strokeWidth={2.5} className="text-white" />
            </motion.div>
            <p className="text-lg font-medium text-center" style={{ fontFamily: "Lora,Georgia,serif" }}>"{name}" aangemaakt</p>
            <p className="text-sm text-muted-foreground text-center">Je vindt de routine terug in het overzicht.</p>
          </motion.div>
        ) : step === 0 ? (
          <motion.div key="s0" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.18 }}>
            <SheetHeader title="Naam & moment" onClose={onClose} />
            <VeldInput autoFocus value={name} onChange={setName} placeholder="Bijv. Ochtendroutine" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 mt-6">Wanneer</p>
            <div className="flex flex-wrap gap-2 mb-8">
              {TRIGGER_OPTIONS.map((opt) => (
                <motion.button key={opt.id} whileTap={{ scale: 0.93 }} onClick={() => setTrigger(opt.id)}
                  animate={{ backgroundColor: trigger === opt.id ? SAGE : "var(--input-background)", color: trigger === opt.id ? "#fff" : "var(--muted-foreground)", boxShadow: trigger === opt.id ? "none" : "var(--shadow-input)" }}
                  transition={{ duration: 0.14 }} className="px-4 py-2 rounded-full text-sm font-medium">{opt.label}</motion.button>
              ))}
            </div>
            <DubbelKnop onCancel={onClose} onConfirm={() => setStep(1)} label="Volgende" disabled={!name.trim() || !trigger} />
          </motion.div>
        ) : (
          <motion.div key="s1" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.18 }}>
            <div className="flex items-center gap-2 mb-7">
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => setStep(0)} aria-label="Terug naar naam en moment" className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--primary)_50%,transparent)]"><ChevronLeft size={16} className="text-muted-foreground" aria-hidden="true" /></motion.button>
              <h3 className="text-xl font-medium text-foreground" style={{ fontFamily: "Lora,Georgia,serif" }}>Taken toevoegen</h3>
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
            <div className="flex gap-2 mb-7">
              <input ref={ref} type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTask()}
                onFocus={() => setInputActive(true)} onBlur={() => setInputActive(false)}
                placeholder="Taak omschrijving…"
                className="flex-1 rounded-2xl px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none text-sm border transition-all"
                style={{
                  background: "var(--input-background)",
                  borderColor: fieldBorderColor({ active: inputActive, hasValue: !!input }),
                  boxShadow: fieldBoxShadow({ active: inputActive }),
                }} />
              <motion.button whileTap={{ scale: 0.88 }} onClick={addTask} disabled={!input.trim()}
                className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 disabled:opacity-40" style={{ background: SAGE }}>
                <Plus size={17} className="text-white" />
              </motion.button>
            </div>
            <DubbelKnop onCancel={onClose} onConfirm={save} label="Opslaan" disabled={tasks.length === 0} />
          </motion.div>
        )}
      </AnimatePresence>
    </Sheet>
  );
}
