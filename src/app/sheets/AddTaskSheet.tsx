import { useState } from "react";
import { useCuraStore } from "../../stores/useCuraStore";
import { useRoomViews } from "../../stores/useViews";
import { Sheet, SheetHeader, VeldInput, DubbelKnop } from "../components/shared";
import { TaskFormFields, buildDueDate, type TaskFormState } from "./TaskFormFields";
import { requestNotificationPermission } from "../lib/useTaskReminders";

export function AddTaskSheet({ onClose }: { onClose: () => void }) {
  const createTask = useCuraStore((s) => s.createTask);
  const rooms = useRoomViews();
  const [title, setTitle] = useState("");
  const [formState, setFormState] = useState<TaskFormState>({
    selectedRoomId: null,
    herhalenAan: false,
    intervalDagen: 7,
    wekkerAan: false,
    wekkerDatum: undefined,
    wekkerTijd: "08:00",
    duurMin: undefined,
    beschrijving: "",
  });

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
      durationMin: formState.duurMin,
      planned: false,
    });
    onClose();
  }

  return (
    <Sheet onClose={onClose}>
      <SheetHeader title="Taak toevoegen" onClose={onClose} />
      <VeldInput value={title} onChange={setTitle} onEnter={handleAdd} placeholder="Wat moet er gebeuren?" />
      <p className="text-xs text-muted-foreground mt-3 mb-4 leading-relaxed">De taak komt in de gedeelde pool. Kies optioneel een kamer.</p>

      <TaskFormFields
        rooms={rooms}
        {...formState}
        onRoomChange={(id) => setFormState((s) => ({ ...s, selectedRoomId: id }))}
        onHerhalenChange={(v) => setFormState((s) => ({ ...s, herhalenAan: v }))}
        onIntervalChange={(v) => setFormState((s) => ({ ...s, intervalDagen: v }))}
        onWekkerChange={(v) => setFormState((s) => ({ ...s, wekkerAan: v }))}
        onWekkerDatumChange={(d) => setFormState((s) => ({ ...s, wekkerDatum: d }))}
        onWekkerTijdChange={(v) => setFormState((s) => ({ ...s, wekkerTijd: v }))}
        onDuurMinChange={(v) => setFormState((s) => ({ ...s, duurMin: v }))}
        onBeschrijvingChange={(v) => setFormState((s) => ({ ...s, beschrijving: v }))}
      />

      <DubbelKnop onCancel={onClose} onConfirm={handleAdd} label="Toevoegen"
        disabled={!title.trim() || (formState.wekkerAan && !formState.herhalenAan && !formState.wekkerDatum)} />
    </Sheet>
  );
}
