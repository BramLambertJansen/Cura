import { useState } from "react";
import { motion } from "motion/react";
import { Copy } from "lucide-react";
import { useCuraStore } from "../../../stores/useCuraStore";
import { useTaskViews } from "../../../stores/useViews";
import { toTaskOverview } from "../../../data/selectors";
import type { TaskView } from "../../../data/types";
import { stagger, fadeUp } from "../../lib/motion";
import { Kop, Leeg, PageHeader, KeuzeChip } from "../../components/shared";
import { TaakRij } from "../../components/TaakRij";
import { useSheets } from "../../sheetContext";
import { useStartFocus } from "../../lib/useStartFocus";

const ALL = "all";
const NONE = "none";

/**
 * Takenoverzicht — every open task on one page, grouped by date status and
 * filterable by room. The split is derived (see `toTaskOverview`); this screen
 * just renders the calm buckets. Empty groups are skipped so it never shows
 * empty cards. Overdue one-off tasks get a "maak nieuwe hiervan" action that
 * drops a fresh copy in the pool (without the stale deadline).
 */
export function TakenPage() {
  const { openEditTask } = useSheets();
  const toggleTask = useCuraStore((s) => s.toggleTask);
  const createTask = useCuraStore((s) => s.createTask);
  const deleteTask = useCuraStore((s) => s.deleteTask);
  const tasks = useTaskViews();
  const startFocus = useStartFocus();
  const [roomFilter, setRoomFilter] = useState<string>(ALL);

  // Room chips are built from the rooms present among open tasks, plus a
  // "Zonder kamer" option when some open task has no room.
  const openTasks = tasks.filter((t) => !t.done);
  const roomsPresent = new Map<string, string>();
  let hasRoomless = false;
  for (const t of openTasks) {
    if (t.roomId) roomsPresent.set(t.roomId, t.room ?? "Kamer");
    else hasRoomless = true;
  }
  const roomOptions = [
    { id: ALL, label: "Alle" },
    ...[...roomsPresent].map(([id, label]) => ({ id, label })),
    ...(hasRoomless ? [{ id: NONE, label: "Zonder kamer" }] : []),
  ];
  const showFilters = roomOptions.length > 2;

  // If the filtered room's last open task was just completed, it drops out of
  // roomOptions — fall back to "Alle" so we never strand the user on a false-empty
  // screen (worse still once the chips hide at ≤2 options, with no way to reset).
  const effectiveFilter = roomOptions.some((o) => o.id === roomFilter) ? roomFilter : ALL;

  const matchesRoom = (t: TaskView) =>
    effectiveFilter === ALL || (effectiveFilter === NONE ? !t.roomId : t.roomId === effectiveFilter);

  const { overdue, recurring, upcoming, undated } = toTaskOverview(tasks.filter(matchesRoom));

  const groups: { label: string; tasks: TaskView[]; renew?: boolean }[] = [
    { label: "Al even blijven liggen", tasks: overdue, renew: true },
    { label: "Waarschijnlijk weer toe", tasks: recurring },
    { label: "In de toekomst", tasks: upcoming },
    { label: "Geen datum", tasks: undated },
  ];
  const nonEmpty = groups.filter((g) => g.tasks.length > 0);

  async function renew(task: TaskView) {
    // A fresh instance in the pool — same essentials, no stale (verlopen) wekker —
    // and retire the old one so "Al even blijven liggen" actually clears instead of
    // accumulating endless duplicates on repeated taps.
    await createTask({
      title: task.title,
      roomId: task.roomId,
      durationMin: task.durationMin,
      description: task.description,
    });
    await deleteTask(task.id);
  }

  return (
    <div className="px-5 pt-14 pb-8">
      <PageHeader title="Takenoverzicht" subtitle="Alles op een rij, geordend op datum." />

      {showFilters && (
        <div role="group" aria-label="Filter op kamer" className="flex flex-wrap gap-2 mb-6">
          {roomOptions.map((opt) => (
            <KeuzeChip key={opt.id} selected={effectiveFilter === opt.id} onClick={() => setRoomFilter(opt.id)}>
              {opt.label}
            </KeuzeChip>
          ))}
        </div>
      )}

      {nonEmpty.length === 0
        ? <Leeg icon="🗂️" text="Nog geen taken om te tonen." />
        : <div className="space-y-8">
            {nonEmpty.map((group) => (
              <section key={group.label}>
                <Kop>{group.label}</Kop>
                <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-2.5">
                  {group.tasks.map((task) => (
                    <motion.div key={task.id} variants={fadeUp} className="space-y-1.5">
                      <TaakRij
                        task={task}
                        onToggle={() => toggleTask(task.id, !task.done)}
                        onEdit={() => openEditTask(task.id)}
                        onStartFocus={() => startFocus(task)}
                      />
                      {group.renew && !task.intervalDays && (
                        <div className="flex justify-end">
                          <button
                            onClick={() => renew(task)}
                            aria-label={`Vervang ${task.title} door een verse taak`}
                            className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full text-muted-foreground focus-ring"
                            style={{ background: "color-mix(in srgb, var(--primary) 7%, transparent)" }}>
                            <Copy size={12} aria-hidden="true" /> Maak nieuwe hiervan
                          </button>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </motion.div>
              </section>
            ))}
          </div>
      }
    </div>
  );
}
