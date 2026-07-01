import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Trash2 } from "lucide-react";
import { useCuraStore } from "../../stores/useCuraStore";
import { useRoomViews } from "../../stores/useViews";
import { Sheet, SheetHeader, VeldInput, DubbelKnop } from "../components/shared";
import { TaskFormFields, buildDueDate, extractTijd, type TaskFormState } from "./TaskFormFields";
import { requestNotificationPermission } from "../lib/useTaskReminders";

export function EditTaskSheet({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const task = useCuraStore((s) => s.tasks.find((t) => t.id === taskId));
  const updateTask = useCuraStore((s) => s.updateTask);
  const deleteTask = useCuraStore((s) => s.deleteTask);
  const rooms = useRoomViews();

  const [title, setTitle] = useState(task?.title ?? "");
  const [confirm, setConfirm] = useState(false);
  const [formState, setFormState] = useState<TaskFormState>(() => {
    const hasWekker = !!task?.dueDate;
    return {
      selectedRoomId: task?.roomId ?? null,
      herhalenAan: !!task?.intervalDays,
      intervalDagen: task?.intervalDays ?? 7,
      wekkerAan: hasWekker,
      wekkerDatum: hasWekker && !task?.intervalDays ? new Date(task!.dueDate!) : undefined,
      wekkerTijd: hasWekker ? extractTijd(task!.dueDate!) : "08:00",
      duurMin: task?.durationMin,
      beschrijving: task?.description ?? "",
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
    await updateTask(taskId, {
      title: title.trim(),
      description: formState.beschrijving.trim() || undefined,
      roomId: formState.selectedRoomId ?? undefined,
      intervalDays: formState.herhalenAan ? formState.intervalDagen : undefined,
      dueDate,
      durationMin: formState.duurMin,
    });
    onClose();
  }

  function remove() {
    deleteTask(taskId);
    onClose();
  }

  return (
    <Sheet onClose={onClose} tall>
      <SheetHeader title="Taak bewerken" onClose={onClose} />
      <VeldInput autoFocus value={title} onChange={setTitle} onEnter={save} placeholder="Wat moet er gebeuren?" />
      <p className="text-xs text-muted-foreground mt-3 mb-4 leading-relaxed">Pas de taak aan en sla op.</p>

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

      <div className="mt-2 mb-4">
        <DubbelKnop onCancel={onClose} onConfirm={save} label="Opslaan"
          disabled={!title.trim() || (formState.wekkerAan && !formState.herhalenAan && !formState.wekkerDatum)} />
      </div>
      <AnimatePresence>
        {!confirm
          ? <motion.button key="del" whileTap={{ scale: 0.96 }} onClick={() => setConfirm(true)}
              className="w-full py-3 rounded-2xl text-sm font-medium flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/50"
              style={{ color: "var(--destructive)" }}>
              <Trash2 size={14} aria-hidden="true" /> Taak verwijderen
            </motion.button>
          : <motion.div key="conf" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
              <motion.button whileTap={{ scale: 0.96 }} onClick={() => setConfirm(false)}
                className="flex-1 py-3 rounded-2xl border border-border text-foreground text-sm font-medium">Toch niet</motion.button>
              <motion.button whileTap={{ scale: 0.96 }} onClick={remove}
                className="flex-1 py-3 rounded-2xl text-white text-sm font-semibold"
                style={{ background: "var(--destructive)" }}>Ja, verwijder</motion.button>
            </motion.div>
        }
      </AnimatePresence>
    </Sheet>
  );
}
