import { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Copy } from "lucide-react";
import { useCuraStore } from "../../../stores/useCuraStore";
import { useTaskViews } from "../../../stores/useViews";
import { toTaskOverview } from "../../../data/selectors";
import type { TaskView } from "../../../data/types";
import { stagger, fadeUp } from "../../lib/motion";
import { Kop, Leeg, FilterPanel, type FilterGroup } from "../../components/shared";
import { PageHero } from "../../components/PageHero";
import { TaakRij } from "../../components/TaakRij";
import { useSheets } from "../../sheetContext";
import { useStartFocus } from "../../lib/useStartFocus";
import { type DurationFilter, durationMatches, DURATION_LABELS, DURATION_FILTER_OPTIONS } from "../../lib/durationFilter";

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
  const navigate = useNavigate();
  const { openEditTask } = useSheets();
  const startFocus = useStartFocus();
  const toggleTask = useCuraStore((s) => s.toggleTask);
  const createTask = useCuraStore((s) => s.createTask);
  const deleteTask = useCuraStore((s) => s.deleteTask);
  const tasks = useTaskViews();
  const [roomFilter, setRoomFilter] = useState<string>(ALL);
  const [durationFilter, setDurationFilter] = useState<DurationFilter>("alles");
  const [filtersOpen, setFiltersOpen] = useState(false);

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
    { id: ALL, label: "Alles" },
    ...[...roomsPresent].map(([id, label]) => ({ id, label })),
    ...(hasRoomless ? [{ id: NONE, label: "Zonder kamer" }] : []),
  ];
  const showRoomFilter = roomOptions.length > 2;
  // Duur-chips zijn er altijd zodra er open taken zijn, ongeacht welke duren daar
  // toevallig onder zitten — zelfde vaste vier buckets als Huis, geen aparte
  // "komt er wel iets uit"-berekening (die zou hier alleen inconsistent ogen).
  const showDurationFilter = openTasks.length > 0;
  const showFilters = showRoomFilter || showDurationFilter;

  // If the filtered room's last open task was just completed, it drops out of
  // roomOptions — fall back to "Alle" so we never strand the user on a false-empty
  // screen (worse still once the chips hide at ≤2 options, with no way to reset).
  const effectiveFilter = roomOptions.some((o) => o.id === roomFilter) ? roomFilter : ALL;
  const filtersActive = effectiveFilter !== ALL || durationFilter !== "alles";

  const matchesRoom = (t: TaskView) =>
    effectiveFilter === ALL || (effectiveFilter === NONE ? !t.roomId : t.roomId === effectiveFilter);
  const matchesDuration = (t: TaskView) => durationMatches(t.durationMin, durationFilter);

  const { overdue, recurring, upcoming, undated } = toTaskOverview(tasks.filter((t) => matchesRoom(t) && matchesDuration(t)));

  // Same shape as Huis' "Alle taken" filter card (FilterPanel, shared.tsx) —
  // collapsed by default, a count badge + one-line summary, "Wis" to reset.
  const activeFilterCount = (effectiveFilter !== ALL ? 1 : 0) + (durationFilter !== "alles" ? 1 : 0);
  const filterSummary = activeFilterCount === 0
    ? `Filter op ${[showRoomFilter && "kamer", showDurationFilter && "duur"].filter(Boolean).join(" en ")}`
    : [effectiveFilter === ALL ? null : roomOptions.find((o) => o.id === effectiveFilter)?.label, durationFilter === "alles" ? null : DURATION_LABELS[durationFilter]]
        .filter(Boolean)
        .join(" · ");
  const filterGroups: FilterGroup[] = [
    ...(showRoomFilter ? [{
      label: "Kamer",
      ariaLabel: "Filter op kamer",
      options: roomOptions.map((opt) => ({ id: opt.id, label: opt.label, selected: effectiveFilter === opt.id, onSelect: () => setRoomFilter(opt.id) })),
    }] : []),
    ...(showDurationFilter ? [{
      label: "Duur",
      ariaLabel: "Filter op duur",
      options: DURATION_FILTER_OPTIONS.map((o) => ({ id: o.id, label: o.label, selected: durationFilter === o.id, onSelect: () => setDurationFilter(o.id) })),
    }] : []),
  ];

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
      dagdeel: task.dagdeel,
    });
    await deleteTask(task.id);
  }

  return (
    <div className="pb-8">
      <PageHero
        src="/headers/taken.webp"
        title="Takenoverzicht"
        onBack={() => navigate("/meer")}
        backLabel="Terug naar Meer"
      />

      <div className="px-5">
      {showFilters && (
        <div className="mb-6">
          <FilterPanel
            groups={filterGroups}
            activeCount={activeFilterCount}
            summary={filterSummary}
            open={filtersOpen}
            onToggle={() => setFiltersOpen((v) => !v)}
            onClear={() => { setRoomFilter(ALL); setDurationFilter("alles"); }}
          />
        </div>
      )}

      {nonEmpty.length === 0
        ? filtersActive
          ? <Leeg image="/states/empty-filter.webp" text="Geen taken binnen deze filters." />
          : <Leeg image="/states/empty-tasks.webp" text="Geen open taken. Nieuwe taken maak je aan met de + onderin." />
        : <div className="space-y-8">
            {nonEmpty.map((group) => (
              <section key={group.label}>
                <Kop>{group.label}</Kop>
                <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-2.5">
                  {group.tasks.map((task) => (
                    <motion.div key={task.id} variants={fadeUp} className="space-y-1.5">
                      <TaakRij
                        task={task}
                        onToggle={toggleTask}
                        onEdit={openEditTask}
                        onStartFocus={startFocus}
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
    </div>
  );
}
