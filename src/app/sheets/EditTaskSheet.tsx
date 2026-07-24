import { useState } from "react";
import { toast } from "sonner";
import { Check, RotateCcw } from "lucide-react";
import { useCuraStore } from "../../stores/useCuraStore";
import { useRoomViews, useTaskView } from "../../stores/useViews";
import { Sheet, SheetHeader, VeldInput, DubbelKnop, VerwijderKnop, PrimaryButton, Kop, KeuzeChip } from "../components/shared";
import { SAGE } from "../lib/constants";
import { TaskFormFields, buildDueDate, extractTijd, type TaskFormState } from "./TaskFormFields";
import { requestNotificationPermission } from "../lib/useTaskReminders";

const DAY_MS = 86_400_000;

export function EditTaskSheet({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const task = useTaskView(taskId);
  const toggleTask = useCuraStore((s) => s.toggleTask);
  const updateTask = useCuraStore((s) => s.updateTask);
  const deleteTask = useCuraStore((s) => s.deleteTask);
  const assignTask = useCuraStore((s) => s.assignTask);
  const members = useCuraStore((s) => s.members);
  const currentUserId = useCuraStore((s) => s.currentUserId);
  const rooms = useRoomViews();
  const me = members.find((m) => m.userId === currentUserId);
  // Only offered in an actual two-person household — a single-member household
  // has no one else to hand a task to, so a "Niemand/Jij"-only picker would be
  // a meaningless stand-in for the existing claim toggle.
  const partner = members.find((m) => m.id !== me?.id);

  const [title, setTitle] = useState(task?.title ?? "");
  const [formState, setFormState] = useState<TaskFormState>(() => {
    const hasWekker = !!task?.dueDate;
    return {
      selectedRoomId: task?.roomId ?? null,
      opMijnDag: !!task?.planned,
      herhalenAan: !!task?.intervalDays,
      intervalDagen: task?.intervalDays ?? 7,
      wekkerAan: hasWekker,
      wekkerDatum: hasWekker && !task?.intervalDays ? new Date(task!.dueDate!) : undefined,
      wekkerTijd: hasWekker ? extractTijd(task!.dueDate!) : "08:00",
      duurMin: task?.durationMin,
      beschrijving: task?.description ?? "",
      gestartAan: !!task?.startedAt,
      checklistItems: task?.checklistItems ?? [],
    };
  });

  if (!task) return null;

  async function save() {
    if (!title.trim()) return;
    if (formState.wekkerAan) await requestNotificationPermission();
    const dueDate = buildDueDate(
      formState.wekkerAan,
      formState.herhalenAan,
      formState.wekkerDatum,
      formState.wekkerTijd,
    );
    // Keep the original "started" moment across unrelated re-saves (e.g.
    // fixing a title typo shouldn't reset when the task started).
    const startedAt = formState.gestartAan
      ? (task!.startedAt ?? new Date().toISOString())
      : undefined;
    await updateTask(taskId, {
      title: title.trim(),
      description: formState.beschrijving.trim() || undefined,
      roomId: formState.selectedRoomId ?? undefined,
      intervalDays: formState.herhalenAan ? formState.intervalDagen : undefined,
      dueDate,
      durationMin: formState.duurMin,
      planned: formState.opMijnDag,
      startedAt,
      checklistItems: formState.checklistItems,
    });
    onClose();
  }

  function remove() {
    deleteTask(taskId);
    onClose();
  }

  async function toggleDone() {
    await toggleTask(taskId, !task!.done);
    onClose();
  }

  // Only a one-off task with a concrete deadline has a meaningful "morgen" to move
  // to — a recurring wekker only encodes a time-of-day, not a specific date
  // (src/data/reminders.ts), so bumping its dueDate by a day wouldn't change anything.
  const postponable = !task.done && !task.intervalDays && !!task.dueDate;

  async function postpone() {
    const nextDueDate = new Date(new Date(task!.dueDate!).getTime() + DAY_MS).toISOString();
    await updateTask(taskId, { dueDate: nextDueDate });
    toast("Verplaatst naar morgen.", { description: `${task!.title} staat morgen weer klaar.` });
    onClose();
  }

  return (
    <Sheet onClose={onClose} tall>
      <SheetHeader title="Taak bewerken" onClose={onClose} />
      <VeldInput value={title} onChange={setTitle} onEnter={save} placeholder="Wat moet er gebeuren?" />
      <p className="text-xs text-muted-foreground mt-3 mb-4 leading-relaxed">Pas de taak aan en sla op.</p>

      <div className="mb-5 space-y-1.5">
        <PrimaryButton
          icon={task.done ? <RotateCcw size={16} aria-hidden="true" /> : <Check size={16} aria-hidden="true" />}
          onClick={toggleDone}>
          {task.done ? "Terugzetten" : "Afvinken"}
        </PrimaryButton>
        {postponable && (
          <button
            type="button"
            onClick={postpone}
            className="w-full py-2.5 text-center text-sm font-medium rounded-lg focus-ring"
            style={{ color: SAGE }}>
            Uitstellen naar morgen
          </button>
        )}
      </div>

      {partner && (
        <div className="mb-5">
          <Kop>Wie pakt dit op?</Kop>
          <div role="group" aria-label="Wie pakt dit op?" className="flex gap-2 mt-3">
            <KeuzeChip selected={!task.claimedById} onClick={() => assignTask(taskId, null)}>Niemand</KeuzeChip>
            {me && (
              <KeuzeChip selected={task.claimedById === me.id} onClick={() => assignTask(taskId, me.id)}>Jij</KeuzeChip>
            )}
            <KeuzeChip selected={task.claimedById === partner.id} onClick={() => assignTask(taskId, partner.id)}>
              {partner.displayName}
            </KeuzeChip>
          </div>
        </div>
      )}

      <TaskFormFields
        rooms={rooms}
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
      />

      <div className="mt-2 mb-4">
        <DubbelKnop onCancel={onClose} onConfirm={save} label="Opslaan"
          disabled={!title.trim() || (formState.wekkerAan && !formState.herhalenAan && !formState.wekkerDatum)} />
      </div>
      <VerwijderKnop label="Taak verwijderen" onConfirm={remove} />
    </Sheet>
  );
}
