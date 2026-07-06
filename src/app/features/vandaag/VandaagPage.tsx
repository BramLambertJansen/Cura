import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";
import { useCuraStore } from "../../../stores/useCuraStore";
import { useActivityFeed, useRoutineViews, useTaskViews } from "../../../stores/useViews";
import { toSuggestions } from "../../../data/selectors";
import { getGreeting } from "../../lib/format";
import { spring, stagger, fadeUp } from "../../lib/motion";
import { useNietVandaag } from "../../lib/useNietVandaag";
import { useTaskDismissals } from "../../lib/useTaskDismissals";
import { Avatar, Kop, Leeg } from "../../components/shared";
import { PageBanner } from "../../components/PageBanner";
import { TaakRij } from "../../components/TaakRij";
import { SuggestieRij } from "../../components/SuggestieRij";
import { RoutineKaartCompact } from "../../components/RoutineKaart";
import { useSheets } from "../../sheetContext";

export function VandaagPage() {
  const { openProfiel, openEditTask } = useSheets();
  const toggleTask = useCuraStore((s) => s.toggleTask);
  const updateTask = useCuraStore((s) => s.updateTask);
  const members = useCuraStore((s) => s.members);
  const currentUserId = useCuraStore((s) => s.currentUserId);
  const tasks = useTaskViews();
  const routines = useRoutineViews();
  const { isDismissed, dismiss, restore } = useNietVandaag();
  const { isDismissed: isTaskDismissed, dismiss: dismissTask, restore: restoreTask } = useTaskDismissals();
  // The suggestions live behind a "peek": the shortest one stays visible as a
  // gentle nudge, the rest wait quietly behind a soft toggle so the section
  // never overshadows the actual day-planning above it.
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);

  const greeting = getGreeting();
  const plannedOpen = tasks.filter((t) => t.planned && !t.done && !isTaskDismissed(t.id));
  const plannedDone = tasks.filter((t) => t.planned && t.done && !isTaskDismissed(t.id));
  const allPlanned = [...plannedOpen, ...plannedDone];
  const suggestions = toSuggestions(tasks).filter((t) => !isDismissed(t.id));
  const visibleSuggestions = suggestionsOpen ? suggestions : suggestions.slice(0, 1);
  const hiddenSuggestionCount = suggestions.length - 1;

  const me = members.find((m) => m.userId === currentUserId);
  // "Wat deed de ander" — only today's completions (so a task finished days ago
  // within its interval doesn't read as if it happened this morning) and only by
  // someone else, matched on member id rather than a display-name string.
  const sinceIso = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, []);
  const feedToday = useActivityFeed(sinceIso);
  const huisgenootActivity = feedToday.filter((a) => a.doneById && a.doneById !== me?.id);

  return (
    <div className="relative">
      {/* Same sunrise art as the auth screen, so opening the app and starting the day feel like one moment. */}
      <PageBanner src="/landing-header.webp" className="h-48" position="72% 35%" />
      <div className="relative px-5 pt-14 pb-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground mb-2 tracking-wide">{greeting.date}</p>
            <h1 className="text-[2.15rem] leading-[1.08] text-foreground font-medium font-display">
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
                        <p key={`${t.taskId}-${t.doneAt}`} className="text-sm text-foreground leading-snug">
                          <span className="font-semibold">{t.doneBy}</span> heeft {t.title.toLowerCase()} gedaan
                          {t.doneAt && <span className="text-muted-foreground"> · {new Date(t.doneAt).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}</span>}
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
                    <TaakRij task={task} onToggle={() => toggleTask(task.id, !task.done)} onEdit={() => openEditTask(task.id)} onDismiss={() => { dismissTask(task.id); toast("Even niet vandaag", { description: `${task.title} staat even uit je dag.`, action: { label: "Ongedaan maken", onClick: () => restoreTask(task.id) } }); }} />
                  </motion.div>
                ))}
              </motion.div>
          }
        </section>

        {suggestions.length > 0 && (
          <section>
            <Kop>Misschien handig vandaag</Kop>
            <motion.div layout className="space-y-2.5">
              <AnimatePresence mode="popLayout" initial={false}>
                {visibleSuggestions.map((task) => (
                  <SuggestieRij
                    key={task.id}
                    task={task}
                    onPlan={() => { updateTask(task.id, { planned: true }); toast("Op je dag gezet", { description: `${task.title} staat klaar wanneer jij wilt.` }); }}
                    onNietVandaag={() => { dismiss(task.id); toast("Even niet vandaag", { description: `${task.title} komt morgen weer langs.`, action: { label: "Ongedaan maken", onClick: () => restore(task.id) } }); }}
                  />
                ))}
              </AnimatePresence>
              {hiddenSuggestionCount > 0 && (
                <motion.button
                  layout
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSuggestionsOpen((v) => !v)}
                  aria-expanded={suggestionsOpen}
                  className="flex items-center justify-center gap-1.5 mx-auto px-3.5 py-2 rounded-full text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary/60 focus-ring"
                >
                  {suggestionsOpen ? "Minder tonen" : `Nog ${hiddenSuggestionCount} suggestie${hiddenSuggestionCount === 1 ? "" : "s"}`}
                  <motion.span animate={{ rotate: suggestionsOpen ? 180 : 0 }} transition={{ type: "spring", stiffness: 400, damping: 30 }} className="flex">
                    <ChevronDown size={14} aria-hidden="true" />
                  </motion.span>
                </motion.button>
              )}
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
                  // De store toont de enige afvink-toast (zie useCuraStore.toggleTask) — hier geen tweede.
                  toggleTask(taskId, !(t?.done ?? false));
                }} />
              </motion.div>
            ))}
          </motion.div>
        </section>
      </div>
    </div>
  );
}
