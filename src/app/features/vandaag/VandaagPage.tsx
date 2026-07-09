import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { Check, ChevronDown, Moon, Sun, Sunrise } from "lucide-react";
import { useCuraStore } from "../../../stores/useCuraStore";
import { useActivityFeed, useRoutineViews, useTaskViews } from "../../../stores/useViews";
import { toSuggestions, toDagdelen, dagdeelForHour } from "../../../data/selectors";
import type { DagdeelGroup } from "../../../data/types";
import { getGreeting } from "../../lib/format";
import { stagger, fadeUp } from "../../lib/motion";
import { useNietVandaag } from "../../lib/useNietVandaag";
import { useTaskDismissals } from "../../lib/useTaskDismissals";
import { SAGE } from "../../lib/constants";
import { Avatar, Kop, Leeg, StatusBadge } from "../../components/shared";
import { PageBanner } from "../../components/PageBanner";
import { TijdlijnTaakRij } from "../../components/TijdlijnTaakRij";
import { SuggestieRij } from "../../components/SuggestieRij";
import { RoutineKaartCompact } from "../../components/RoutineKaart";
import { useSheets } from "../../sheetContext";

/** Icon per dagdeel-pill — purely decorative, echoes the sun/moon language the routine trigger options already use. */
const DAGDEEL_ICON: Record<DagdeelGroup["key"], typeof Sunrise> = {
  ochtend: Sunrise,
  middag: Sun,
  avond: Moon,
  overig: Sun,
};

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
  // The suggestions section collapses behind a chevron; open by default (an
  // established choice, unrelated to this restyle) so it reads as a calm,
  // glanceable list rather than a hidden peek. The two NEW collapsible
  // sections below (afgerond, logboek) start closed — secondary information
  // with no prior default to preserve.
  const [suggestiesOpen, setSuggestiesOpen] = useState(false);
  const [afgerondOpen, setAfgerondOpen] = useState(false);
  const [logboekOpen, setLogboekOpen] = useState(false);

  const greeting = getGreeting();
  const plannedOpen = tasks.filter((t) => t.planned && !t.done && !isTaskDismissed(t.id));
  const plannedDone = tasks.filter((t) => t.planned && t.done && !isTaskDismissed(t.id));
  const totalPlanned = plannedOpen.length + plannedDone.length;
  const doneCount = plannedDone.length;
  const suggestions = toSuggestions(tasks).filter((t) => !isDismissed(t.id));
  const dagdelen = useMemo(() => toDagdelen(plannedOpen), [plannedOpen]);
  const nuDagdeel = dagdeelForHour(new Date().getHours());

  const me = members.find((m) => m.userId === currentUserId);
  // "Logboek" — vandaag's eigen + huisgenoot-activiteit samen, alleen van vandaag
  // (zodat een taak die dagen geleden binnen zijn interval is afgevinkt niet
  // leest alsof die vanochtend gebeurde), nieuwste eerst.
  const sinceIso = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, []);
  const feedToday = useActivityFeed(sinceIso);
  const logboek = useMemo(
    () => [...feedToday].sort((a, b) => b.doneAt.localeCompare(a.doneAt)),
    [feedToday],
  );

  const pct = totalPlanned > 0 ? doneCount / totalPlanned : 0;
  const allDone = totalPlanned > 0 && doneCount === totalPlanned;
  const heroTitle = totalPlanned === 0 ? "Rustige dag" : allDone ? "Alles rond" : doneCount === 0 ? "Klaar voor vandaag" : "Lekker op weg";
  const heroSub =
    totalPlanned === 0
      ? "Niets op de planning."
      : allDone
        ? "Mooi gedaan vandaag."
        : doneCount === 0
          ? `${totalPlanned} ${totalPlanned === 1 ? "ding staat" : "dingen staan"} rustig klaar.`
          : `${doneCount} van ${totalPlanned} rustig afgerond.`;

  return (
    <div className="relative">
      {/* Same sunrise art as the auth screen, so opening the app and starting the day feel like one moment. */}
      <PageBanner src="/landing-header.webp" className="h-48" position="72% 35%" />
      <div className="relative px-5 pt-14 pb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground mb-2 tracking-wide">{greeting.date}</p>
            <h1 className="text-[2.15rem] leading-[1.08] text-foreground font-medium font-display">
              {greeting.text}
            </h1>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{greeting.sub}</p>
          </div>
          <motion.button onClick={openProfiel} whileTap={{ scale: 0.88 }} aria-label="Profiel openen" className="flex-shrink-0 mt-1">
            <Avatar name={me?.displayName ?? "Jij"} size={36} tone="solid" serif />
          </motion.button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32, delay: 0.05 }}
          className="mt-5 rounded-[1.5rem] bg-card border border-border/60 px-5 py-4"
          style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="mb-3">
            <p className="font-display text-[1.2rem] leading-tight text-foreground">{heroTitle}</p>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "color-mix(in srgb, var(--muted-foreground) 14%, transparent)" }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: "var(--gradient-primary)" }}
              initial={{ width: 0 }}
              animate={{ width: `${pct * 100}%` }}
              transition={{ duration: 0.6, ease: [0.22, 0.61, 0.36, 1] }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{heroSub}</p>
        </motion.div>
      </div>

      <div className="relative px-5 pb-8 space-y-8">
        <section>
          <div className="flex items-center gap-2 mb-2 ml-1">
            <Kop>Taken vandaag</Kop>
            {plannedOpen.length > 0 && (
              <span className="text-xs font-semibold text-muted-foreground ml-auto">{plannedOpen.length} open</span>
            )}
          </div>
          {plannedOpen.length === 0 ? (
            <Leeg
              icon="🌿"
              image="/empty-plants.webp"
              text={allDone ? "Alles rond voor vandaag. Geniet van de rust." : "Niets op de planning. Geniet ervan."}
            />
          ) : (
            <div className="rounded-[1.6rem] bg-card border border-border/60 p-4" style={{ boxShadow: "var(--shadow-card)" }}>
              <div className="space-y-5">
                {dagdelen.map((groep) => {
                  const Icon = DAGDEEL_ICON[groep.key];
                  const isNu = groep.key === nuDagdeel;
                  return (
                    <section key={groep.key}>
                      <div
                        className="inline-flex items-center gap-1.5 mb-2 px-3 py-1 rounded-full"
                        style={{ background: isNu ? "color-mix(in srgb, var(--primary) 13%, transparent)" : "color-mix(in srgb, var(--muted-foreground) 7%, transparent)" }}>
                        <Icon size={11} aria-hidden="true" style={{ color: isNu ? SAGE : "var(--muted-foreground)" }} />
                        <span className="text-[0.66rem] font-semibold tracking-wide uppercase" style={{ color: isNu ? SAGE : "var(--muted-foreground)" }}>
                          {groep.label}
                        </span>
                        {isNu && (
                          <span className="text-[0.58rem] font-semibold uppercase px-1.5 py-px rounded-full" style={{ color: SAGE, background: "color-mix(in srgb, var(--card) 55%, transparent)" }}>
                            nu
                          </span>
                        )}
                      </div>
                      <div>
                        {groep.tasks.map((task) => (
                          <TijdlijnTaakRij
                            key={task.id}
                            task={task}
                            onToggle={() => toggleTask(task.id, !task.done)}
                            onEdit={() => openEditTask(task.id)}
                            onDismiss={() => {
                              dismissTask(task.id);
                              toast("Even niet vandaag", {
                                description: `${task.title} staat even uit je dag.`,
                                action: { label: "Ongedaan maken", onClick: () => restoreTask(task.id) },
                              });
                            }}
                          />
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {plannedDone.length > 0 && (
          <section>
            <div className="rounded-2xl overflow-hidden" style={{ background: "color-mix(in srgb, var(--card) 60%, transparent)", border: "1px solid var(--border)" }}>
              <motion.button
                whileTap={{ scale: 0.99 }}
                onClick={() => setAfgerondOpen((v) => !v)}
                aria-expanded={afgerondOpen}
                aria-label={afgerondOpen ? "Afgeronde taken inklappen" : "Afgeronde taken uitklappen"}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 focus-ring">
                <span className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <Check size={13} style={{ color: SAGE }} aria-hidden="true" /> {plannedDone.length} afgerond vandaag
                </span>
                <motion.span animate={{ rotate: afgerondOpen ? 180 : 0 }} transition={{ type: "spring", stiffness: 400, damping: 30 }} className="flex text-muted-foreground">
                  <ChevronDown size={15} aria-hidden="true" />
                </motion.span>
              </motion.button>
              <AnimatePresence initial={false}>
                {afgerondOpen && (
                  <motion.div
                    key="afgerond"
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.24 }} className="overflow-hidden">
                    <div className="px-3 pb-3 space-y-1.5">
                      {plannedDone.map((task) => (
                        <button
                          key={task.id}
                          onClick={() => toggleTask(task.id, false)}
                          aria-label={`${task.title} als niet gedaan markeren`}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-card text-left focus-ring">
                          <span className="w-[19px] h-[19px] rounded-full flex items-center justify-center flex-shrink-0" style={{ background: SAGE }} aria-hidden="true">
                            <Check size={10} strokeWidth={3.4} className="text-white" />
                          </span>
                          <span className="flex-1 min-w-0 text-sm text-muted-foreground line-through truncate">{task.title}</span>
                          <span className="text-[0.66rem] flex-shrink-0" style={{ color: "color-mix(in srgb, var(--muted-foreground) 60%, transparent)" }}>terug</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>
        )}

        {suggestions.length > 0 && (
          <section>
            <div className="rounded-2xl bg-card-active border border-border/60 overflow-hidden" style={{ boxShadow: "var(--shadow-card)" }}>
              <motion.button
                whileTap={{ scale: 0.99 }}
                onClick={() => setSuggestiesOpen((v) => !v)}
                aria-expanded={suggestiesOpen}
                aria-label={suggestiesOpen ? "Suggesties inklappen" : "Suggesties uitklappen"}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 focus-ring">
                <span className="inline-flex items-center gap-2">
                  <span className="font-display font-semibold text-sm text-foreground">Misschien handig</span>
                  <StatusBadge enter="slide">{suggestions.length}</StatusBadge>
                </span>
                <motion.span animate={{ rotate: suggestiesOpen ? 180 : 0 }} transition={{ type: "spring", stiffness: 400, damping: 30 }} className="flex text-muted-foreground">
                  <ChevronDown size={15} aria-hidden="true" />
                </motion.span>
              </motion.button>
              <AnimatePresence initial={false}>
                {suggestiesOpen && (
                  <motion.div
                    layout
                    key="suggestions"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.24 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-3 space-y-2">
                      <AnimatePresence mode="popLayout" initial={false}>
                        {suggestions.map((task) => (
                          <SuggestieRij
                            key={task.id}
                            task={task}
                            onPlan={() => { updateTask(task.id, { planned: true }); toast("Op je dag gezet", { description: `${task.title} staat klaar wanneer jij wilt.` }); }}
                            onNietVandaag={() => { dismiss(task.id); toast("Even niet vandaag", { description: `${task.title} komt morgen weer langs.`, action: { label: "Ongedaan maken", onClick: () => restore(task.id) } }); }}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>
        )}

        <section>
          <Kop>Routines van vandaag</Kop>
          <motion.div
            variants={stagger} initial="initial" animate="animate"
            className="flex gap-3 overflow-x-auto pb-1 -mx-5 px-5 scrollbar-hide" style={{ scrollSnapType: "x proximity" }}>
            {routines.slice(0, 2).map((r) => (
              <motion.div key={r.id} variants={fadeUp} className="flex-shrink-0 w-[168px]" style={{ scrollSnapAlign: "start" }}>
                <RoutineKaartCompact routine={r} />
              </motion.div>
            ))}
          </motion.div>
        </section>

        {logboek.length > 0 && (
          <section>
            <div className="rounded-2xl overflow-hidden" style={{ background: "color-mix(in srgb, var(--card) 60%, transparent)", border: "1px solid var(--border)" }}>
              <motion.button
                whileTap={{ scale: 0.99 }}
                onClick={() => setLogboekOpen((v) => !v)}
                aria-expanded={logboekOpen}
                aria-label={logboekOpen ? "Logboek inklappen" : "Logboek uitklappen"}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 focus-ring">
                <span className="inline-flex items-center gap-2">
                  <span className="font-display font-semibold text-sm text-foreground">Logboek</span>
                  <StatusBadge enter="slide">{logboek.length}</StatusBadge>
                </span>
                <motion.span animate={{ rotate: logboekOpen ? 180 : 0 }} transition={{ type: "spring", stiffness: 400, damping: 30 }} className="flex text-muted-foreground">
                  <ChevronDown size={15} aria-hidden="true" />
                </motion.span>
              </motion.button>
              <AnimatePresence initial={false}>
                {logboekOpen && (
                  <motion.div
                    key="logboek"
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.24 }} className="overflow-hidden" aria-live="polite">
                    <div className="px-3 pb-3 space-y-2">
                      {logboek.map((a) => {
                        const mine = !!a.doneById && a.doneById === me?.id;
                        return (
                          <div key={`${a.taskId}-${a.doneAt}`} className="flex items-start gap-2.5 px-2.5 py-2 rounded-xl bg-card">
                            <Avatar name={mine ? "Jij" : a.doneBy} size={28} tone={mine ? "solid" : "soft"} serif />
                            <div className="min-w-0">
                              <p className="text-sm text-foreground leading-snug">
                                <span className="font-semibold">{mine ? "Jij" : a.doneBy}</span> {mine ? "hebt" : "heeft"} {a.title.toLowerCase()} gedaan
                              </p>
                              <p className="text-[0.68rem] text-muted-foreground mt-0.5">
                                {new Date(a.doneAt).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
