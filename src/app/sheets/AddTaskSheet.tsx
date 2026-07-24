import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, SlidersHorizontal, Sun } from "lucide-react";
import { useCuraStore } from "../../stores/useCuraStore";
import { useRoomViews } from "../../stores/useViews";
import { FieldShell, Sheet, SheetHeader, Toggle, VeldInput, DubbelKnop } from "../components/shared";
import { TaskFormFields, buildDueDate, type TaskFormState } from "./TaskFormFields";
import { requestNotificationPermission } from "../lib/useTaskReminders";
import { SAGE } from "../lib/constants";

export function AddTaskSheet({ roomId, onClose, headerExtra }: { roomId?: string | null; onClose: () => void; headerExtra?: ReactNode }) {
  const createTask = useCuraStore((s) => s.createTask);
  const rooms = useRoomViews();
  const [title, setTitle] = useState("");
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [formState, setFormState] = useState<TaskFormState>({
    selectedRoomId: roomId ?? null,
    opMijnDag: false,
    herhalenAan: false,
    intervalDagen: 7,
    wekkerAan: false,
    wekkerDatum: undefined,
    wekkerTijd: "08:00",
    duurMin: undefined,
    beschrijving: "",
    gestartAan: false,
    checklistItems: [],
    dagdeel: undefined,
  });

  const selectedRoom = rooms.find((r) => r.id === formState.selectedRoomId);
  const optionSummary = [
    selectedRoom?.name,
    formState.herhalenAan ? "Herhalen" : null,
    formState.wekkerAan ? "Wekker" : null,
    formState.dagdeel ? formState.dagdeel.charAt(0).toUpperCase() + formState.dagdeel.slice(1) : null,
    formState.duurMin ? `${formState.duurMin} min` : null,
    formState.gestartAan ? "Gestart" : null,
    formState.checklistItems.length ? `${formState.checklistItems.length} subtaken` : null,
  ].filter(Boolean).join(" / ");

  async function handleAdd() {
    if (!title.trim()) return;
    if (formState.wekkerAan) await requestNotificationPermission();
    const dueDate = buildDueDate(
      formState.wekkerAan,
      formState.herhalenAan,
      formState.wekkerDatum,
      formState.wekkerTijd,
    );
    createTask({
      title: title.trim(),
      description: formState.beschrijving.trim() || undefined,
      roomId: formState.selectedRoomId ?? undefined,
      intervalDays: formState.herhalenAan ? formState.intervalDagen : undefined,
      dueDate,
      dagdeel: formState.dagdeel,
      durationMin: formState.duurMin,
      planned: formState.opMijnDag,
      startedAt: formState.gestartAan ? new Date().toISOString() : undefined,
      checklistItems: formState.checklistItems,
    });
    onClose();
  }

  return (
    <Sheet onClose={onClose}>
      <SheetHeader title="Taak toevoegen" onClose={onClose} />
      {headerExtra}
      <VeldInput value={title} onChange={setTitle} onEnter={handleAdd} placeholder="Wat moet er gebeuren?" />
      <p className="text-xs text-muted-foreground mt-3 mb-4 leading-relaxed">
        {formState.opMijnDag ? "De taak komt op je dag en in de gedeelde pool." : "De taak komt in de gedeelde pool. Meer hoeft niet."}
      </p>

      <div className="mb-4">
        <FieldShell hasValue={formState.opMijnDag} className="flex items-center justify-between py-3.5 px-4">
          <div className="flex items-center gap-2.5">
            <Sun size={16} style={{ color: formState.opMijnDag ? SAGE : "var(--muted-foreground)" }} aria-hidden="true" />
            <span className="text-sm font-medium text-foreground">Zet op mijn dag</span>
          </div>
          <Toggle checked={formState.opMijnDag} onChange={(v) => setFormState((s) => ({ ...s, opMijnDag: v }))} label="Zet op mijn dag" />
        </FieldShell>
      </div>

      <div className="mb-6 rounded-2xl overflow-hidden" style={{ background: "color-mix(in srgb, var(--card) 68%, transparent)", border: "1px solid var(--border)" }}>
        <motion.button
          type="button"
          whileTap={{ scale: 0.99 }}
          onClick={() => setOptionsOpen((v) => !v)}
          aria-expanded={optionsOpen}
          className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left focus-ring"
        >
          <span className="min-w-0 flex items-center gap-2.5">
            <SlidersHorizontal size={15} className="text-muted-foreground" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">Meer opties</span>
              <span className="block text-xs text-muted-foreground mt-0.5 truncate">
                {optionSummary || "Kamer, herhalen, wekker, duur en beschrijving"}
              </span>
            </span>
          </span>
          <motion.span animate={{ rotate: optionsOpen ? 180 : 0 }} transition={{ type: "spring", stiffness: 400, damping: 30 }} className="flex text-muted-foreground">
            <ChevronDown size={16} aria-hidden="true" />
          </motion.span>
        </motion.button>
        <AnimatePresence initial={false}>
          {optionsOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.24 }}
              className="overflow-hidden"
            >
              <div className="px-3 pb-4 pt-1">
                <TaskFormFields
                  rooms={rooms}
                  showDayToggle={false}
                  {...formState}
                  onRoomChange={(id) => setFormState((s) => ({ ...s, selectedRoomId: id }))}
                  onOpMijnDagChange={(v) => setFormState((s) => ({ ...s, opMijnDag: v }))}
                  onHerhalenChange={(v) => setFormState((s) => ({ ...s, herhalenAan: v }))}
                  onIntervalChange={(v) => setFormState((s) => ({ ...s, intervalDagen: v }))}
                  onWekkerChange={(v) => setFormState((s) => ({ ...s, wekkerAan: v }))}
                  onWekkerDatumChange={(d) => setFormState((s) => ({ ...s, wekkerDatum: d }))}
                  onWekkerTijdChange={(v) => setFormState((s) => ({ ...s, wekkerTijd: v }))}
                  onDuurMinChange={(v) => setFormState((s) => ({ ...s, duurMin: v }))}
                  onBeschrijvingChange={(v) => setFormState((s) => ({ ...s, beschrijving: v }))}
                  onGestartChange={(v) => setFormState((s) => ({ ...s, gestartAan: v }))}
                  onChecklistItemsChange={(items) => setFormState((s) => ({ ...s, checklistItems: items }))}
                  onDagdeelChange={(v) => setFormState((s) => ({ ...s, dagdeel: v }))}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <DubbelKnop onCancel={onClose} onConfirm={handleAdd} label="Toevoegen"
        disabled={!title.trim() || (formState.wekkerAan && !formState.herhalenAan && !formState.wekkerDatum)} />
    </Sheet>
  );
}
