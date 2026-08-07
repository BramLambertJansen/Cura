import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Check, ChevronDown, Plus, SlidersHorizontal } from "lucide-react";
import { useCuraStore } from "../../../stores/useCuraStore";
import { useRoomViews, useTaskViews } from "../../../stores/useViews";
import { SAGE } from "../../lib/constants";
import { stagger, fadeUp } from "../../lib/motion";
import { Card, IconBadge, KeuzeChip, StatusBadge, Kop, CollapsibleSection } from "../../components/shared";
import { PageHero } from "../../components/PageHero";
import { TaakRij } from "../../components/TaakRij";
import { KamerKaart } from "../../components/KamerKaart";
import { EmptyIllustration } from "../../components/EmptyIllustration";
import { useSheets } from "../../sheetContext";
import { useHuisTaskActions } from "./useHuisTaskActions";

type DurationFilter = "alles" | "kort" | "middel" | "lang";

function durationMatches(durationMin: number | undefined, filter: DurationFilter) {
  if (filter === "alles") return true;
  if (durationMin === undefined) return false;
  if (filter === "kort") return durationMin <= 15;
  if (filter === "middel") return durationMin > 15 && durationMin <= 45;
  return durationMin > 45;
}

const DURATION_LABELS: Record<DurationFilter, string> = {
  alles: "Alle duur",
  kort: "≤ 15 min",
  middel: "15–45 min",
  lang: "45+ min",
};

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
          <div className="rounded-2xl bg-card-active border border-border/60 overflow-hidden" style={{ boxShadow: "var(--shadow-card)" }}>
            <div className="flex items-center gap-1 pr-2">
              <motion.button
                whileTap={{ scale: 0.99 }}
                onClick={() => setFiltersOpen((v) => !v)}
                aria-expanded={filtersOpen}
                aria-label={filtersOpen ? "Filters inklappen" : "Filters uitklappen"}
                className="flex-1 min-w-0 flex items-center gap-3 px-4 py-3.5 focus-ring">
                <IconBadge icon={<SlidersHorizontal size={18} />} size={40} />
                <div className="flex-1 min-w-0 text-left">
                  <span className="inline-flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">Filters</p>
                    {activeFilterCount > 0 && <StatusBadge enter="slide">{activeFilterCount}</StatusBadge>}
                  </span>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{filterSummary}</p>
                </div>
                <motion.span animate={{ rotate: filtersOpen ? 180 : 0 }} transition={{ type: "spring", stiffness: 400, damping: 30 }} className="flex text-muted-foreground flex-shrink-0">
                  <ChevronDown size={15} aria-hidden="true" />
                </motion.span>
              </motion.button>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={() => { setRoomFilter("alles"); setDurationFilter("alles"); }}
                  className="text-xs font-medium text-muted-foreground px-2 py-1.5 rounded-lg focus-ring flex-shrink-0">
                  Wis
                </button>
              )}
            </div>
            <AnimatePresence initial={false}>
              {filtersOpen && (
                <motion.div
                  key="filters"
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.24 }} className="overflow-hidden">
                  <div className="px-4 pb-4 space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">Kamer</p>
                      <div role="group" aria-label="Filter op kamer" className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
                        <KeuzeChip selected={roomFilter === "alles"} onClick={() => setRoomFilter("alles")}>Alles</KeuzeChip>
                        {rooms.map((r) => (
                          <KeuzeChip key={r.id} selected={roomFilter === r.id} onClick={() => setRoomFilter(r.id)}>{r.name}</KeuzeChip>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">Duur</p>
                      <div role="group" aria-label="Filter op duur" className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
                        <KeuzeChip selected={durationFilter === "alles"} onClick={() => setDurationFilter("alles")}>Alles</KeuzeChip>
                        <KeuzeChip selected={durationFilter === "kort"} onClick={() => setDurationFilter("kort")}>≤ 15 min</KeuzeChip>
                        <KeuzeChip selected={durationFilter === "middel"} onClick={() => setDurationFilter("middel")}>15–45 min</KeuzeChip>
                        <KeuzeChip selected={durationFilter === "lang"} onClick={() => setDurationFilter("lang")}>45+ min</KeuzeChip>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

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
        {/* A vertical KamerKaart list, not the 3-column image-tile grid the frozen
            Claude-Design mockup shows — deliberate: a full-bleed photo grid can't
            carry the featured-badge/count text at WCAG AA contrast the way
            an inset-art card can (CLAUDE.md §6), and rooms without art would need
            a second, inconsistent tile treatment. */}
        <Kop>Kamers</Kop>
        {rooms.length === 0 && (
          <div className="text-center pt-4 pb-6">
            <EmptyIllustration src="/states/empty-rooms.webp" />
            <p className="text-sm text-muted-foreground mt-1">Nog geen kamers. Voeg er hieronder een toe.</p>
          </div>
        )}
        <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-2.5">
          {sortedRooms.map((r) => (
            <motion.div key={r.id} variants={fadeUp}>
              <KamerKaart room={r} featured={r.id === featuredRoomId} onClick={() => navigate(`/huis/${r.id}`)} />
            </motion.div>
          ))}
          <motion.div variants={fadeUp}>
            <motion.button onClick={openNewRoom} whileTap={{ scale: 0.985 }}
              className="w-full flex items-center gap-4 bg-card rounded-2xl px-4 py-3.5 border-2 border-dashed focus-ring"
              style={{ borderColor: "color-mix(in srgb, var(--border-color) 16%, transparent)", color: "var(--muted-foreground)" }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 bg-secondary">
                <Plus size={20} strokeWidth={1.75} aria-hidden="true" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-muted-foreground">Kamer toevoegen</p>
              </div>
            </motion.button>
          </motion.div>
        </motion.div>
      </section>
      </div>
    </div>
  );
}
