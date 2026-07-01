import { useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Trash2 } from "lucide-react";
import { useCuraStore } from "../../stores/useCuraStore";
import { SAGE, TRIGGER_OPTIONS } from "../lib/constants";
import { cadenceAndLabel } from "../lib/format";
import { Sheet, SheetHeader, Kop, VeldInput, DubbelKnop, fieldBorderColor, fieldBoxShadow } from "../components/shared";
import { TaakDraftRij, type TaakDraftItem } from "./TaakDraftRij";

export function EditRoutineSheet({ bundleId, onClose }: { bundleId: string; onClose: () => void }) {
  const bundle = useCuraStore((s) => s.bundles.find((b) => b.id === bundleId));
  const updateBundle = useCuraStore((s) => s.updateBundle);
  const deleteBundle = useCuraStore((s) => s.deleteBundle);

  const [name, setName] = useState(bundle?.name ?? "");
  const [trigger, setTrigger] = useState(
    TRIGGER_OPTIONS.find((o) => o.label === bundle?.trigger)?.id ?? "ochtend",
  );
  // One-time read (not a subscription): this seeds the local draft list, which
  // then owns its own edits until save — it must not live-resync with the store.
  const [tasks, setTasks] = useState<TaakDraftItem[]>(
    () => useCuraStore.getState().tasks
      .filter((t) => t.bundleId === bundleId)
      .map((t) => ({ key: t.id, title: t.title, durationMin: t.durationMin, description: t.description })),
  );
  const [input, setInput] = useState("");
  const [inputActive, setInputActive] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!bundle) return null;

  function addTask() {
    if (!input.trim()) return;
    setTasks((p) => [...p, { key: crypto.randomUUID(), title: input.trim() }]);
    setInput("");
    inputRef.current?.focus();
  }

  function save() {
    if (!name.trim()) return;
    const tLabel = TRIGGER_OPTIONS.find((t) => t.id === trigger)?.label ?? bundle?.trigger ?? "";
    const { cadence, windowLabel } = cadenceAndLabel(trigger);
    updateBundle(bundleId, { name: name.trim(), trigger: tLabel, cadence, windowLabel }, tasks);
    onClose();
  }

  function remove() {
    deleteBundle(bundleId);
    onClose();
  }

  return (
    <Sheet onClose={onClose} tall>
      <SheetHeader title="Routine bewerken" onClose={onClose} />

      <Kop>Naam</Kop>
      <VeldInput autoFocus value={name} onChange={setName} placeholder="Naam van de routine" ariaLabel="Naam van de routine" />

      <Kop><span className="mt-5 block">Wanneer</span></Kop>
      <div className="flex flex-wrap gap-2 mb-6">
        {TRIGGER_OPTIONS.map((opt) => (
          <motion.button key={opt.id} whileTap={{ scale: 0.93 }} onClick={() => setTrigger(opt.id)}
            aria-pressed={trigger === opt.id}
            initial={{ backgroundColor: "var(--input-background)", color: "var(--muted-foreground)" }}
            animate={{
              backgroundColor: trigger === opt.id ? SAGE : "var(--input-background)",
              color: trigger === opt.id ? "#ffffff" : "var(--muted-foreground)",
              boxShadow: trigger === opt.id ? "none" : "var(--shadow-input)",
            }}
            transition={{ duration: 0.14 }}
            className="px-4 py-2 rounded-full text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--primary)_50%,transparent)]">
            {opt.label}
          </motion.button>
        ))}
      </div>

      <Kop>Taken</Kop>
      <div className="space-y-2 mb-3 max-h-72 overflow-y-auto scrollbar-hide">
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
        <input ref={inputRef} type="text" value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTask()}
          onFocus={() => setInputActive(true)}
          onBlur={() => setInputActive(false)}
          placeholder="Taak toevoegen…"
          aria-label="Nieuwe taak omschrijving"
          className="flex-1 rounded-2xl px-4 py-3 text-foreground placeholder:text-muted-foreground/70 outline-none text-sm border transition-all"
          style={{
            background: "var(--input-background)",
            borderColor: fieldBorderColor({ active: inputActive, hasValue: !!input }),
            boxShadow: fieldBoxShadow({ active: inputActive }),
          }} />
        <motion.button whileTap={{ scale: 0.88 }} onClick={addTask} disabled={!input.trim()}
          aria-label="Taak toevoegen"
          className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--primary)_50%,transparent)]"
          style={{ background: SAGE }}>
          <Plus size={17} className="text-white" aria-hidden="true" />
        </motion.button>
      </div>

      <div className="mb-4">
        <DubbelKnop onCancel={onClose} onConfirm={save} label="Opslaan" disabled={!name.trim() || tasks.length === 0} />
      </div>

      <AnimatePresence>
        {!confirm
          ? <motion.button key="del" whileTap={{ scale: 0.96 }} onClick={() => setConfirm(true)}
              aria-label={`${bundle.name} verwijderen`}
              className="w-full py-3 rounded-2xl text-sm font-medium flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/50"
              style={{ color: "var(--destructive)" }}>
              <Trash2 size={14} aria-hidden="true" /> Routine verwijderen
            </motion.button>
          : <motion.div key="conf" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
              <motion.button whileTap={{ scale: 0.96 }} onClick={() => setConfirm(false)}
                className="flex-1 py-3 rounded-2xl border border-border text-foreground text-sm font-medium">
                Toch niet
              </motion.button>
              <motion.button whileTap={{ scale: 0.96 }} onClick={remove}
                className="flex-1 py-3 rounded-2xl text-white text-sm font-semibold"
                style={{ background: "var(--destructive)" }}>
                Ja, verwijder
              </motion.button>
            </motion.div>
        }
      </AnimatePresence>
    </Sheet>
  );
}
