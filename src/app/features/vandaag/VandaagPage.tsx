import { useMemo, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { Clock, Leaf, Sparkles } from "lucide-react";
import { useCuraStore } from "../../../stores/useCuraStore";
import { useRoutineViews, useTaskViews } from "../../../stores/useViews";
import { toSuggestions } from "../../../data/selectors";
import { getGreeting } from "../../lib/format";
import { spring, stagger, fadeUp } from "../../lib/motion";
import { useNietVandaag } from "../../lib/useNietVandaag";
import { useTaskDismissals } from "../../lib/useTaskDismissals";
import { Avatar, Card, Kop, Leeg } from "../../components/shared";
import { PageBanner } from "../../components/PageBanner";
import { TaakRij } from "../../components/TaakRij";
import { SuggestieRij } from "../../components/SuggestieRij";
import { RoutineKaartCompact } from "../../components/RoutineKaart";
import { useSheets } from "../../sheetContext";

type QuickFilter = "alles" | "kort" | "rustig";

// Below this many suggestions, filter chips add more chrome than they save —
// the list itself is already scannable at a glance.
const SUGGESTION_FILTER_THRESHOLD = 6;

function warmDoneToast(title: string) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(8);
  toast.success("Lekker bezig", {
    description: `${title} is gedaan. Dat scheelt weer.`,
  });
}

function durationMinutes(duration?: string): number | null {
  const match = duration?.match(/\d+/);
  return match ? Number(match[0]) : null;
}

export function VandaagPage() {
  const { openProfiel, openEditTask } = useSheets();
  const toggleTask = useCuraStore((s) => s.toggleTask);
  const updateTask = useCuraStore((s) => s.updateTask);
  const members = useCuraStore((s) => s.members);
  const currentUserId = useCuraStore((s) => s.currentUserId);
  const tasks = useTaskViews();
  const routines = useRoutineViews();
  const { isDismissed, dismiss } = useNietVandaag();
  const { isDismissed: isTaskDismissed, dismiss: dismissTask } = useTaskDismissals();
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("alles");

  const greeting = getGreeting();
  const plannedOpen = tasks.filter((t) => t.planned && !t.done && !isTaskDismissed(t.id));
  const plannedDone = tasks.filter((t) => t.planned && t.done && !isTaskDismissed(t.id));
  const allPlanned = [...plannedOpen, ...plannedDone];
  const suggestions = toSuggestions(tasks).filter((t) => !isDismissed(t.id));
  const showSuggestionFilters = suggestions.length > SUGGESTION_FILTER_THRESHOLD;
  const filteredSuggestions = useMemo(() => suggestions.filter((task) => {
    if (!showSuggestionFilters) return true;
    if (quickFilter === "kort") return (durationMinutes(task.duration) ?? 99) <= 10;
    if (quickFilter === "rustig") return !task.wekkerLabel && (durationMinutes(task.duration) ?? 20) <= 20;
    return true;
  }), [quickFilter, suggestions, showSuggestionFilters]);
  const quickFilters: { id: QuickFilter; label: string; icon: ReactNode }[] = [
    { id: "alles", label: "Alles", icon: <Sparkles size={12} /> },
    { id: "kort", label: "≤ 10 min", icon: <Clock size={12} /> },
    { id: "rustig", label: "Rustig", icon: <Leaf size={12} /> },
  ];

  const me = members.find((m) => m.userId === currentUserId);
  const huisgenootActivity = tasks.filter(
    (t) => t.done && t.doneBy && t.doneBy !== (me?.displayName ?? ""),
  );

  return (
    <div className="relative">
      {/* Same sunrise art as the auth screen, so opening the app and starting the day feel like one moment. */}
      <PageBanner src="/landing-header.webp" className="h-48" position="72% 35%" />
      <div className="relative px-5 pt-14 pb-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground mb-2 tracking-wide">{greeting.date}</p>
            <h1 className="text-[2.15rem] leading-[1.08] text-foreground font-medium" style={{ fontFamily: "Lora,Georgia,serif" }}>
              {greeting.text}
            </h1>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{greeting.sub}</p>
          </div>
          <div className="flex flex-col items-center gap-2.5 flex-shrink-0 pt-1">
            <motion.button onClick={openProfiel} whileTap={{ scale: 0.88 }} aria-label="Profiel openen">
              <Avatar name={me?.displayName ?? "Jij"} size={36} tone="solid" serif />
            </motion.button>
          </div>
        </div>
      </div>

      <div className="relative px-5 pt-7 pb-8 space-y-8">
        <AnimatePresence>
          {huisgenootActivity.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={spring} aria-live="polite">
              <div className="rounded-2xl px-4 py-3.5 space-y-2.5" style={{ background: "color-mix(in srgb, var(--accent) 22%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 40%, transparent)" }}>
                {Object.entries(
                  huisgenootActivity.reduce<Record<string, typeof huisgenootActivity>>((acc, t) => {
                    const name = t.doneBy!;
                    (acc[name] ??= []).push(t);
                    return acc;
                  }, {}),
                ).map(([name, activities]) => (
                  <div key={name} className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0">
                      <Avatar name={name} size={32} tone="soft" />
                    </div>
                    <div className="space-y-0.5">
                      {activities.map((t) => (
                        <p key={t.id} className="text-sm text-foreground leading-snug">
                          <span className="font-semibold">{t.doneBy}</span> heeft {t.title.toLowerCase()} gedaan
                          {t.doneAt && <span className="text-muted-foreground"> · {t.doneAt}</span>}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <section>
          <Kop>Mijn dag</Kop>
          {allPlanned.length === 0
            ? <Leeg icon="🌿" image="/empty-plants.webp" text="Niets op de planning. Geniet ervan." />
            : <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-2.5">
                {allPlanned.map((task) => (
                  <motion.div key={task.id} variants={fadeUp}>
                    <TaakRij task={task} onToggle={() => { const nextDone = !task.done; toggleTask(task.id, nextDone); if (nextDone) warmDoneToast(task.title); }} onEdit={() => openEditTask(task.id)} onDismiss={() => { dismissTask(task.id); toast("Even niet vandaag", { description: `${task.title} staat even uit je dag.` }); }} />
                  </motion.div>
                ))}
              </motion.div>
          }
        </section>

        {suggestions.length > 0 && (
          <section>
            <div className="flex items-center justify-between gap-3 mb-2">
              <Kop>Misschien handig vandaag</Kop>
              {showSuggestionFilters && <span className="text-[11px] text-muted-foreground">{filteredSuggestions.length} past</span>}
            </div>
            {showSuggestionFilters && (
              <div className="-mx-5 mb-3 overflow-x-auto scrollbar-hide px-5">
                <div className="flex gap-2">
                  {quickFilters.map((filter) => {
                    const active = quickFilter === filter.id;
                    return (
                      <motion.button
                        key={filter.id}
                        whileTap={{ scale: 0.94 }}
                        onClick={() => setQuickFilter(filter.id)}
                        aria-pressed={active}
                        className="flex flex-shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition-[background-color,color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--primary)_50%,transparent)]"
                        style={{
                          background: active ? "var(--gradient-primary)" : "color-mix(in srgb, var(--card) 78%, transparent)",
                          color: active ? "white" : "var(--muted-foreground)",
                          boxShadow: active ? "0 4px 14px color-mix(in srgb, var(--primary) 22%, transparent)" : "var(--shadow-input)",
                        }}
                      >
                        {filter.icon}
                        {filter.label}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}
            <motion.div layout variants={stagger} initial="initial" animate="animate" className="space-y-2.5">
              <AnimatePresence mode="popLayout">
                {filteredSuggestions.length === 0 ? (
                  <motion.div key="no-filtered-suggestions" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                    <Card className="px-4 py-4 text-center">
                      <p className="text-sm font-medium text-foreground">Niets dat precies past.</p>
                      <p className="mt-1 text-xs text-muted-foreground">Kies een andere filter of laat Cura rustig meedenken.</p>
                    </Card>
                  </motion.div>
                ) : filteredSuggestions.map((task) => (
                  <motion.div key={task.id} layout variants={fadeUp}>
                    <SuggestieRij
                      task={task}
                      onPlan={() => { updateTask(task.id, { planned: true }); toast("Op je dag gezet", { description: `${task.title} staat klaar wanneer jij wilt.` }); }}
                      onNietVandaag={() => dismiss(task.id)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          </section>
        )}

        <section>
          <Kop>Routines van vandaag</Kop>
          <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-3">
            {routines.slice(0, 2).map((r) => (
              <motion.div key={r.id} variants={fadeUp}>
                <RoutineKaartCompact routine={r} onToggleTask={(taskId) => {
                  const t = r.tasks.find((x) => x.id === taskId);
                  const nextDone = !(t?.done ?? false);
                  toggleTask(taskId, nextDone);
                  if (nextDone) warmDoneToast(t?.title ?? "Taak");
                }} />
              </motion.div>
            ))}
          </motion.div>
        </section>
      </div>
    </div>
  );
}
