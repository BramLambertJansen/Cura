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
import { Avatar, Card, Kop, Leeg } from "../../components/shared";
import { TaakRij } from "../../components/TaakRij";
import { SuggestieRij } from "../../components/SuggestieRij";
import { RoutineKaartCompact } from "../../components/RoutineKaart";
import { useSheets } from "../../sheetContext";

type QuickFilter = "alles" | "kort" | "rustig" | "samen";

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

function dayStatusLine(openCount: number, doneCount: number, suggestionCount: number) {
  if (doneCount > 0 && openCount === 0) return "Alles wat op je dag stond is rond. Fijn voor het huis.";
  if (doneCount > 0) return `${doneCount} klaar · ${openCount} rustig open`;
  if (openCount > 0) return `${openCount} ${openCount === 1 ? "ding" : "dingen"} op je dag — stap voor stap.`;
  if (suggestionCount > 0) return "Geen vaste planning. Kies iets kleins als je ruimte hebt.";
  return "Rustige dag. Geniet ervan.";
}

function DayStatusCard({ openCount, doneCount, suggestionCount }: { openCount: number; doneCount: number; suggestionCount: number }) {
  const total = openCount + doneCount;
  const progress = total > 0 ? doneCount / total : 0;
  const percent = Math.round(progress * 100);
  return (
    <Card className="relative overflow-hidden px-4 py-4">
      <motion.div
        aria-hidden="true"
        className="absolute inset-y-0 left-0 rounded-2xl"
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(8, percent)}%` }}
        transition={{ type: "spring", stiffness: 220, damping: 30 }}
        style={{ background: "linear-gradient(90deg,color-mix(in srgb,var(--accent) 32%,transparent),transparent)" }}
      />
      <div className="relative flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Vandaag voelt</p>
          <p className="mt-1 text-sm font-semibold text-foreground leading-snug">{dayStatusLine(openCount, doneCount, suggestionCount)}</p>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">Geen haast — pak wat past bij je energie.</p>
        </div>
        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full" style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)", color: "var(--primary)" }}>
          <span className="text-sm font-bold tabular-nums">{doneCount}/{Math.max(total, 1)}</span>
        </div>
      </div>
    </Card>
  );
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
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("alles");

  const greeting = getGreeting();
  const plannedOpen = tasks.filter((t) => t.planned && !t.done);
  const plannedDone = tasks.filter((t) => t.planned && t.done);
  const allPlanned = [...plannedDone, ...plannedOpen];
  const suggestions = toSuggestions(tasks).filter((t) => !isDismissed(t.id));
  const filteredSuggestions = useMemo(() => suggestions.filter((task) => {
    if (quickFilter === "kort") return (durationMinutes(task.duration) ?? 99) <= 10;
    if (quickFilter === "rustig") return !task.wekkerLabel && (durationMinutes(task.duration) ?? 20) <= 20;
    if (quickFilter === "samen") return Boolean(task.room) || Boolean(task.claimedBy);
    return true;
  }), [quickFilter, suggestions]);
  const quickFilters: { id: QuickFilter; label: string; icon: ReactNode }[] = [
    { id: "alles", label: "Alles", icon: <Sparkles size={12} /> },
    { id: "kort", label: "≤ 10 min", icon: <Clock size={12} /> },
    { id: "rustig", label: "Rustig", icon: <Leaf size={12} /> },
    { id: "samen", label: "Samen", icon: <Sparkles size={12} /> },
  ];

  const me = members.find((m) => m.userId === currentUserId);
  const huisgenootActivity = tasks.filter(
    (t) => t.done && t.doneBy && t.doneBy !== (me?.displayName ?? ""),
  );

  return (
    <div>
      <div className="px-5 pt-14 pb-8">
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

      <div className="px-5 pt-7 pb-8 space-y-8">
        <DayStatusCard openCount={plannedOpen.length} doneCount={plannedDone.length} suggestionCount={suggestions.length} />
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
            ? <Leeg icon="🌿" text="Niets op de planning. Geniet ervan." />
            : <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-2.5">
                {allPlanned.map((task) => (
                  <motion.div key={task.id} variants={fadeUp}>
                    <TaakRij task={task} onToggle={() => { const nextDone = !task.done; toggleTask(task.id, nextDone); if (nextDone) warmDoneToast(task.title); }} onEdit={() => openEditTask(task.id)} />
                  </motion.div>
                ))}
              </motion.div>
          }
        </section>

        {suggestions.length > 0 && (
          <section>
            <div className="flex items-center justify-between gap-3 mb-2">
              <Kop>Misschien handig vandaag</Kop>
              <span className="text-[11px] text-muted-foreground">{filteredSuggestions.length} past</span>
            </div>
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
