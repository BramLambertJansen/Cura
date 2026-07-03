import { useState } from "react";
import { AnimatePresence } from "motion/react";
import { useCuraStore } from "../../stores/useCuraStore";
import { useRoutineView } from "../../stores/useViews";
import { TRIGGER_OPTIONS } from "../lib/constants";
import { cadenceAndLabel } from "../lib/format";
import { Sheet, SheetHeader, Kop, VeldInput, DubbelKnop, KeuzeChip, VerwijderKnop, TaakToevoegRij } from "../components/shared";
import { TaakDraftRij, type TaakDraftItem } from "./TaakDraftRij";

export function EditRoutineSheet({ bundleId, onClose }: { bundleId: string; onClose: () => void }) {
  const bundle = useRoutineView(bundleId);
  const updateBundle = useCuraStore((s) => s.updateBundle);
  const deleteBundle = useCuraStore((s) => s.deleteBundle);

  const [name, setName] = useState(bundle?.name ?? "");
  const [trigger, setTrigger] = useState(
    TRIGGER_OPTIONS.find((o) => o.label === bundle?.trigger)?.id ?? "ochtend",
  );
  // One-time read (not a subscription): this seeds the local draft list, which
  // then owns its own edits until save — it must not live-resync with the store.
  const [tasks, setTasks] = useState<TaakDraftItem[]>(
    () => (bundle?.tasks ?? [])
      .map((t) => ({ key: t.id, title: t.title, durationMin: t.durationMin, description: t.description })),
  );
  const [input, setInput] = useState("");

  if (!bundle) return null;

  function addTask() {
    if (!input.trim()) return;
    setTasks((p) => [...p, { key: crypto.randomUUID(), title: input.trim() }]);
    setInput("");
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
          <KeuzeChip key={opt.id} selected={trigger === opt.id} onClick={() => setTrigger(opt.id)}>
            {opt.label}
          </KeuzeChip>
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

      <TaakToevoegRij value={input} onChange={setInput} onAdd={addTask} placeholder="Taak toevoegen…" ariaLabel="Nieuwe taak omschrijving" />

      <div className="mb-4">
        <DubbelKnop onCancel={onClose} onConfirm={save} label="Opslaan" disabled={!name.trim() || tasks.length === 0} />
      </div>

      <VerwijderKnop label="Routine verwijderen" ariaLabel={`${bundle.name} verwijderen`} onConfirm={remove} />
    </Sheet>
  );
}
