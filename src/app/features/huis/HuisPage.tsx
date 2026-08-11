import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Check, Plus } from "lucide-react";
import { useCuraStore } from "../../../stores/useCuraStore";
import { useRoomViews, useTaskViews } from "../../../stores/useViews";
import { SAGE } from "../../lib/constants";
import { stagger, fadeUp } from "../../lib/motion";
import { type DurationFilter, durationMatches, DURATION_LABELS, DURATION_FILTER_OPTIONS } from "../../lib/durationFilter";
import { Card, Kop, CollapsibleSection, FilterPanel, type FilterGroup } from "../../components/shared";
import { PageHero } from "../../components/PageHero";
import { TaakRij } from "../../components/TaakRij";
import { KamerKaart } from "../../components/KamerKaart";
import { EmptyIllustration } from "../../components/EmptyIllustration";
import { useSheets } from "../../sheetContext";
import { useHuisTaskActions } from "./useHuisTaskActions";

/**
 * Huis's list view — the merged "Alle taken" + "Kamers" home. Room detail
 * (via `/huis/:roomId`) is its own page, RoomDetailPage, spun out of what
 * used to be a single dual-purpose component (#156); the two share almost no
 * JSX, only planTask/dismissWithUndo via useHuisTaskActions.
 */
export function HuisPage() {
  const { openNewRoom, openEditTask } = useSheets();
  const toggleTask = useCuraStore((s) => s.toggleTask);
  const rooms = useRoomViews();
  const tasks = useTaskViews();
  const { handleUnclaim, isTaskDismissed, planTask, dismissWithUndo } = useHuisTaskActions(tasks);
  const navigate = useNavigate();
  const [roomFilter, setRoomFilter] = useState("alles");
  const [durationFilter, setDurationFilter] = useState<DurationFilter>("alles");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [afgerondOpen, setAfgerondOpen] = useState(false);
  // Stable (id-based) dispatcher for TaakRij's onDismiss, scoped to this
  // page's own "waar" label — dismissWithUndo itself is already stable
  // (useHuisTaskActions), this just pins the second argument (#173).
  const handleDismissAllTasks = useCallback((taskId: string) => dismissWithUndo(taskId, "alle taken"), [dismissWithUndo]);

  const visibleTasks = useMemo(() => tasks.filter((t) => !isTaskDismissed(t.id)), [tasks, isTaskDismissed]);
  const filteredTasks = useMemo(
    () => visibleTasks.filter((t) => {
      const matchesRoom = roomFilter === "alles" || t.roomId === roomFilter;
      return matchesRoom && durationMatches(t.durationMin, durationFilter);
    }),
    [visibleTasks, roomFilter, durationFilter],
  );
  const openTasks = filteredTasks.filter((t) => !t.done);
  const doneTasks = filteredTasks.filter((t) => t.done);
  // Total across every room, unfiltered — a stable at-a-glance household load,
  // not the (room/duration-)filtered subset currently shown in the list below.
  // Deliberately off `tasks`, not `visibleTasks`: a personal "niet vandaag"
  // dismissal is device-local (useTaskDismissals) and shouldn't understate the
  // shared household count for a housemate who hasn't dismissed anything.
  const totalOpenCount = useMemo(() => tasks.filter((t) => !t.done).length, [tasks]);
  // Most-neglected room first, so the grid surfaces what needs attention instead
  // of reading every room as equally important. openCount alone (no fabricated
  // "days since" claim — CLAUDE.md §2 honesty-over-precision) is a real, already-
  // derived signal; a room only gets featured if it actually has open tasks.
  const sortedRooms = useMemo(() => [...rooms].sort((a, b) => b.openCount - a.openCount), [rooms]);
  const featuredRoomId = sortedRooms[0]?.openCount > 0 ? sortedRooms[0].id : undefined;
  const activeFilterCount = (roomFilter !== "alles" ? 1 : 0) + (durationFilter !== "alles" ? 1 : 0);
  const filterSummary = activeFilterCount === 0
    ? "Filter op kamer en duur"
    : [roomFilter === "alles" ? null : rooms.find((r) => r.id === roomFilter)?.name, durationFilter === "alles" ? null : DURATION_LABELS[durationFilter]]
        .filter(Boolean)
        .join(" · ");
  const filterGroups: FilterGroup[] = [
    {
      label: "Kamer",
      ariaLabel: "Filter op kamer",
      options: [
        { id: "alles", label: "Alles", selected: roomFilter === "alles", onSelect: () => setRoomFilter("alles") },
        ...rooms.map((r) => ({ id: r.id, label: r.name, selected: roomFilter === r.id, onSelect: () => setRoomFilter(r.id) })),
      ],
    },
    {
      label: "Duur",
      ariaLabel: "Filter op duur",
      options: DURATION_FILTER_OPTIONS.map((o) => ({ id: o.id, label: o.label, selected: durationFilter === o.id, onSelect: () => setDurationFilter(o.id) })),
    },
  ];

  return (
    <div className="pb-8">
      <PageHero src="/headers/huis.webp" title="Huis" />

      <div className="px-5">

      <section className="mb-8">
        <div className="flex items-center gap-2 mb-2 ml-1">
          <Kop>Alle taken</Kop>
          {totalOpenCount > 0 && <span className="text-xs font-semibold ml-auto" style={{ color: SAGE }}>{totalOpenCount} open</span>}
        </div>
        <div className="space-y-4">
          <FilterPanel
            groups={filterGroups}
            activeCount={activeFilterCount}
            summary={filterSummary}
            open={filtersOpen}
            onToggle={() => setFiltersOpen((v) => !v)}
            onClear={() => { setRoomFilter("alles"); setDurationFilter("alles"); }}
          />

          {filteredTasks.length === 0 ? (
            <Card className="flex flex-col items-center gap-3 py-10 px-6 text-center">
              <EmptyIllustration src="/states/empty-filter.webp" className="!w-32 !h-32 -my-2" />
              <div>
                <p className="text-sm font-semibold text-foreground">Geen taken gevonden</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed max-w-[240px]">Pas je filters aan of voeg een taak toe in een kamer.</p>
              </div>
            </Card>
          ) : (
            <>
              {openTasks.length > 0 ? (
                <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-3">
                  {openTasks.map((t) => (
                    <motion.div key={t.id} variants={fadeUp}>
                      <TaakRij task={t} onToggle={toggleTask} showClaim onPlan={planTask} onUnclaim={handleUnclaim} onEdit={openEditTask} onDismiss={handleDismissAllTasks} />
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <p className="text-center text-xs text-muted-foreground italic py-2" style={{ fontStyle: "italic" }}>Geen taken binnen dit filter.</p>
              )}
              {doneTasks.length > 0 && (
                <CollapsibleSection
                  title="Afgerond"
                  count={doneTasks.length}
                  icon={<Check size={13} style={{ color: SAGE }} aria-hidden="true" />}
                  open={afgerondOpen}
                  onToggle={() => setAfgerondOpen((v) => !v)}>
                  <div className="space-y-3">
                    {doneTasks.map((t) => (
                      <TaakRij key={t.id} task={t} onToggle={toggleTask} onEdit={openEditTask} onDismiss={handleDismissAllTasks} />
                    ))}
                  </div>
                </CollapsibleSection>
              )}
            </>
          )}
        </div>
      </section>

      <section>
        {/* Compact image-tile grid (CLAUDE.md §5 Huis), matching the Figma/Make
            mockup. KamerKaart keeps featured/openCount legible at this size by
            putting that text on the tile's own opaque surface below the art,
            never over the photo itself — so WCAG AA contrast (§6) doesn't
            depend on which watercolor happens to sit behind it. */}
        <Kop>Kamers</Kop>
        {rooms.length === 0 && (
          <div className="text-center pt-4 pb-6">
            <EmptyIllustration src="/states/empty-rooms.webp" />
            <p className="text-sm text-muted-foreground mt-1">Nog geen kamers. Voeg er hieronder een toe.</p>
          </div>
        )}
        <motion.div variants={stagger} initial="initial" animate="animate" className="grid grid-cols-3 gap-4">
          {sortedRooms.map((r) => (
            <motion.div key={r.id} variants={fadeUp}>
              <KamerKaart room={r} featured={r.id === featuredRoomId} onClick={() => navigate(`/huis/${r.id}`)} />
            </motion.div>
          ))}
          <motion.div variants={fadeUp} className="h-full">
            <motion.button onClick={openNewRoom} whileTap={{ scale: 0.97 }}
              className="h-full w-full flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl border-2 border-dashed focus-ring"
              style={{ borderColor: "color-mix(in srgb, var(--border-color) 16%, transparent)", color: "var(--muted-foreground)" }}>
              <Plus size={20} strokeWidth={1.75} aria-hidden="true" />
              <span className="text-xs font-medium text-center leading-tight px-1">Kamer toevoegen</span>
            </motion.button>
          </motion.div>
        </motion.div>
      </section>
      </div>
    </div>
  );
}
