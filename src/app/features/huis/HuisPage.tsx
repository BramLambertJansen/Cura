import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { Check, ChevronDown, Plus, SlidersHorizontal, Sparkles } from "lucide-react";
import { useCuraStore } from "../../../stores/useCuraStore";
import { useRoomViews, useTaskViews } from "../../../stores/useViews";
import { roomIcon, SAGE, SHADOW } from "../../lib/constants";
import { spring, stagger, fadeUp } from "../../lib/motion";
import { PageHeader, HintBanner, Card, IconBadge, KeuzeChip, StatusBadge, Kop, CollapsibleSection } from "../../components/shared";
import { TaakRij } from "../../components/TaakRij";
import { KamerKaart } from "../../components/KamerKaart";
import { RoomHero } from "../../components/RoomThumb";
import { EmptyIllustration } from "../../components/EmptyIllustration";
import { useSheets } from "../../sheetContext";
import { useTaskDismissals } from "../../lib/useTaskDismissals";
import { useStartFocus } from "../../lib/useStartFocus";
import { ROOM_TEMPLATES, categoryForIconKey } from "../../lib/templates";

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

export function HuisPage() {
  const { openNewRoom, openEditRoom, openEditTask, openAddTask } = useSheets();
  const toggleTask = useCuraStore((s) => s.toggleTask);
  const claimTask = useCuraStore((s) => s.claimTask);
  const updateTask = useCuraStore((s) => s.updateTask);
  const createTasksFromTemplates = useCuraStore((s) => s.createTasksFromTemplates);
  // Swipe-right on a pool row both plans and claims the task. Planning an
  // unplanned task auto-claims it (useCuraStore.updateTask); a task that's
  // already planned but unclaimed (e.g. someone let go of it via "Laat los")
  // needs the direct claim instead, since re-setting `planned: true` on an
  // already-planned task is a no-op transition and wouldn't claim it.
  const planTask = (t: { id: string; title: string; planned: boolean }) => {
    if (t.planned) claimTask(t.id, true);
    else updateTask(t.id, { planned: true });
    toast("Op je dag gezet", { description: `${t.title} staat klaar wanneer jij wilt.` });
  };
  const rooms = useRoomViews();
  const tasks = useTaskViews();
  const { isDismissed: isTaskDismissed, dismiss: dismissTask, restore: restoreTask } = useTaskDismissals();
  const startFocus = useStartFocus();
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();
  const [roomFilter, setRoomFilter] = useState("alles");
  const [durationFilter, setDurationFilter] = useState<DurationFilter>("alles");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [afgerondOpen, setAfgerondOpen] = useState(false);

  // Room detail is a real route (/huis/:roomId) so the OS/browser back gesture
  // returns to this page instead of leaving Huis entirely.
  const room = rooms.find((r) => r.id === roomId);
  const dismissWithUndo = (t: { id: string; title: string }, waar: string) => {
    dismissTask(t.id);
    toast("Even niet vandaag", { description: `${t.title} staat even uit ${waar}.`, action: { label: "Ongedaan maken", onClick: () => restoreTask(t.id) } });
  };

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
  const totalOpenCount = useMemo(() => visibleTasks.filter((t) => !t.done).length, [visibleTasks]);
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

  if (room) {
    const ic = roomIcon(room.iconKey);
    const roomTasks = tasks.filter((t) => t.roomId === room.id && !isTaskDismissed(t.id));
    const open = roomTasks.filter((t) => !t.done);
    const done = roomTasks.filter((t) => t.done);
    // Up to 2 one-tap suggestions from this room's template category, skipping
    // anything already added (by title) so a suggestion disappears the moment
    // it's used instead of staying around as a now-redundant offer.
    const existingTitles = new Set(roomTasks.map((t) => t.title.trim().toLowerCase()));
    const quickSuggestions = ROOM_TEMPLATES[categoryForIconKey(room.iconKey)]
      .filter((t) => !existingTitles.has(t.title.trim().toLowerCase()))
      .slice(0, 2);

    return (
      <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={spring}>
        <RoomHero
          ic={ic}
          onBack={() => navigate("/huis")}
          onEdit={() => openEditRoom(room.id)}
          editLabel={`${room.name} bewerken`}
        />

        <div className={`px-5 pb-6 relative z-10 ${ic.image ? "-mt-10" : "pt-4"}`}>
          <h2 className="text-3xl font-medium text-foreground leading-tight font-display">{room.name}</h2>
          {room.owner && <p className="text-muted-foreground text-xs mt-1">Meestal {room.owner}</p>}
        </div>

        <div className="px-5 pb-6">
          <HintBanner>{room.hint}</HintBanner>
        </div>

        <div className="px-5 pb-28 space-y-3">
          {roomTasks.length === 0 ? (
            <div className="text-center pt-2 pb-4">
              <EmptyIllustration />
              <p className="text-sm text-muted-foreground mt-1">Nog geen taken in deze kamer.</p>
            </div>
          ) : (
            <>
              <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-3">
                {open.map((t) => (
                  <motion.div key={t.id} variants={fadeUp}>
                    <TaakRij
                      task={t}
                      onToggle={() => toggleTask(t.id, !t.done)}
                      showClaim
                      onPlan={() => planTask(t)}
                      onUnclaim={() => claimTask(t.id, false)}
                      onEdit={() => openEditTask(t.id)}
                      onDismiss={() => dismissWithUndo(t, "deze lijst")}
                      onStartFocus={() => startFocus(t)}
                    />
                  </motion.div>
                ))}
              </motion.div>
              {done.map((t) => (
                <TaakRij key={t.id} task={t} onToggle={() => toggleTask(t.id, !t.done)} onEdit={() => openEditTask(t.id)} onDismiss={() => dismissWithUndo(t, "deze lijst")} />
              ))}
            </>
          )}

          <button
            onClick={() => openAddTask(room.id)}
            className="w-full flex items-center gap-3 bg-card rounded-2xl px-4 py-3.5 border-2 border-dashed focus-ring"
            style={{ borderColor: "color-mix(in srgb, var(--border-color) 16%, transparent)", color: "var(--muted-foreground)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-secondary">
              <Plus size={18} strokeWidth={1.75} aria-hidden="true" />
            </div>
            <span className="text-sm font-medium">Taak toevoegen aan {room.name}</span>
          </button>

          {quickSuggestions.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground ml-1">Snel toevoegen</p>
              {quickSuggestions.map((t) => (
                <button
                  key={t.title}
                  onClick={() => createTasksFromTemplates(room.id, [t])}
                  className="w-full flex items-center gap-3 bg-card rounded-2xl px-4 py-3 border border-border/60 focus-ring text-left"
                  style={{ boxShadow: SHADOW }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-secondary">
                    <Plus size={15} strokeWidth={2} aria-hidden="true" />
                  </div>
                  <span className="flex-1 min-w-0 text-sm font-medium text-foreground truncate">{t.title}</span>
                  {t.durationMin && <span className="text-xs text-muted-foreground flex-shrink-0">{t.durationMin} min</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <div className="px-5 pt-14 pb-8">
      <PageHeader title="Huis" subtitle="Elke ruimte op z'n plek." />

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
                      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
                        <KeuzeChip selected={roomFilter === "alles"} onClick={() => setRoomFilter("alles")}>Alles</KeuzeChip>
                        {rooms.map((r) => (
                          <KeuzeChip key={r.id} selected={roomFilter === r.id} onClick={() => setRoomFilter(r.id)}>{r.name}</KeuzeChip>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">Duur</p>
                      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
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
              <IconBadge icon={<Sparkles size={20} />} size={44} />
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
                      <TaakRij task={t} onToggle={() => toggleTask(t.id, !t.done)} showClaim onPlan={() => planTask(t)} onUnclaim={() => claimTask(t.id, false)} onEdit={() => openEditTask(t.id)} onDismiss={() => dismissWithUndo(t, "alle taken")} onStartFocus={() => startFocus(t)} />
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <p className="text-center text-xs text-muted-foreground/60 italic py-2" style={{ fontStyle: "italic" }}>Geen taken binnen dit filter.</p>
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
                      <TaakRij key={t.id} task={t} onToggle={() => toggleTask(t.id, !t.done)} onEdit={() => openEditTask(t.id)} onDismiss={() => dismissWithUndo(t, "alle taken")} />
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
            carry the featured-badge/owner/count text at WCAG AA contrast the way
            an inset-art card can (CLAUDE.md §6), and rooms without art would need
            a second, inconsistent tile treatment. */}
        <Kop>Kamers</Kop>
        {rooms.length === 0 && (
          <div className="text-center pt-4 pb-6">
            <EmptyIllustration />
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
                <p className="text-[11px] text-muted-foreground/60 mt-0.5" style={{ fontStyle: "italic" }}>Geef elke ruimte een plek</p>
              </div>
            </motion.button>
          </motion.div>
        </motion.div>
      </section>
    </div>
  );
}
