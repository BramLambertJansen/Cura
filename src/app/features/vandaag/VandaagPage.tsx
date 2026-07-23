import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { Check, ChevronRight, Heart, Moon, Pencil, Plus, Sun, Sunrise, X } from "lucide-react";
import { useCuraStore } from "../../../stores/useCuraStore";
import { useActivityFeed, useRoutineViews, useTaskViews } from "../../../stores/useViews";
import { toSuggestions, toDagdelen, dagdeelForHour, splitDagdelen, splitPickedUpToday } from "../../../data/selectors";
import type { DagdeelGroup } from "../../../data/types";
import { getGreeting } from "../../lib/format";
import { stagger, fadeUp } from "../../lib/motion";
import { useNietVandaag } from "../../lib/useNietVandaag";
import { useTaskDismissals } from "../../lib/useTaskDismissals";
import { useSwipeHint } from "../../lib/useSwipeHint";
import { SAGE } from "../../lib/constants";
import { Avatar, Card, CARD_CHROME, CollapsibleSection, IconBadge, IconButton, Kop, Leeg } from "../../components/shared";
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
  const navigate = useNavigate();
  const { openEditTask } = useSheets();
  const toggleTask = useCuraStore((s) => s.toggleTask);
  const updateTask = useCuraStore((s) => s.updateTask);
  const members = useCuraStore((s) => s.members);
  const currentUserId = useCuraStore((s) => s.currentUserId);
  const tasks = useTaskViews();
  const routines = useRoutineViews();
  const { isDismissed, dismiss, restore } = useNietVandaag();
  const { isDismissed: isTaskDismissed, dismiss: dismissTask, restore: restoreTask } = useTaskDismissals();
  const swipeHint = useSwipeHint();
  // The suggestions section collapses behind a chevron; open by default (an
  // established choice, unrelated to this restyle) so it reads as a calm,
  // glanceable list rather than a hidden peek. The collapsible section below
  // (afgerond) starts closed — secondary information with no prior default
  // to preserve.
  const [suggestiesOpen, setSuggestiesOpen] = useState(false);
  const [afgerondOpen, setAfgerondOpen] = useState(false);
  const [laterOpen, setLaterOpen] = useState(false);

  // Re-render roughly once a minute so `nuDagdeel` below (derived from
  // `new Date()`) doesn't stay stuck on the previous dagdeel after 12:00/18:00
  // while the page stays open with no other state change to trigger a render.
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const greeting = getGreeting();
  const plannedOpen = tasks.filter((t) => t.planned && !t.done && !isTaskDismissed(t.id));
  const plannedDone = tasks.filter((t) => t.planned && t.done && !isTaskDismissed(t.id));
  const totalPlanned = plannedOpen.length + plannedDone.length;
  const doneCount = plannedDone.length;
  const suggestions = toSuggestions(tasks).filter((t) => !isDismissed(t.id));
  const { pickedUpToday, rest } = splitPickedUpToday(plannedOpen);
  const dagdelen = toDagdelen(rest);
  const nuDagdeel = dagdeelForHour(new Date().getHours());
  const { dagdelenNow, dagdelenLater } = splitDagdelen(dagdelen, nuDagdeel);
  const laterCount = dagdelenLater.reduce((n, g) => n + g.tasks.length, 0);
  // Never the first "Vandaag opgepakt" row: those rows get no onDismiss (no
  // left-swipe postpone), so peeking one there would visually demonstrate a
  // gesture that then does nothing on that exact row.
  const firstTaskId = dagdelenNow[0]?.tasks[0]?.id;

  const me = members.find((m) => m.userId === currentUserId);
  // Vandaag's eigen + huisgenoot-activiteit samen, alleen van vandaag (zodat een
  // taak die dagen geleden binnen zijn interval is afgevinkt niet leest alsof die
  // vanochtend gebeurde), nieuwste eerst — feeds the Samen preview card below.
  const sinceIso = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, []);
  // toActivityFeed (selectors.ts) already sorts newest-first by completedAt — no re-sort needed here.
  const logboek = useActivityFeed(sinceIso);
  // The Samen preview card's live signal: the first (newest) completion today
  // that wasn't the current user's own — a confirmed housemate id, not just
  // "not mine", so an unresolved/unknown doer never counts as a housemate.
  const housemateActivity = logboek.find((a) => !!a.doneById && a.doneById !== me?.id);
  const samenSubtitle = housemateActivity
    ? `${housemateActivity.doneBy} rondde ${housemateActivity.title.toLowerCase()} af`
    : "Zie wat huisgenoten vandaag deden";

  const renderDagdeelGroep = (groep: DagdeelGroup) => {
    const Icon = DAGDEEL_ICON[groep.key];
    const isNu = groep.key === nuDagdeel;
    return (
      <motion.section key={groep.key} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
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
          <AnimatePresence mode="popLayout" initial={false}>
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
                peek={!swipeHint.seen && task.id === firstTaskId}
              />
            ))}
          </AnimatePresence>
        </div>
      </motion.section>
    );
  };

  const pct = totalPlanned > 0 ? doneCount / totalPlanned : 0;
  const allDone = totalPlanned > 0 && doneCount === totalPlanned;
  const heroTitle = totalPlanned === 0 ? "Rustige dag" : allDone ? "Alles rond" : doneCount === 0 ? "Klaar voor vandaag" : "Lekker op weg";
  const heroSub =
    totalPlanned === 0
      ? "Niets op de planning."
      : allDone
        ? "Mooi gedaan."
        : doneCount === 0
          ? `${totalPlanned} ${totalPlanned === 1 ? "ding staat" : "dingen staan"} rustig klaar.`
          : `${doneCount} van ${totalPlanned} rustig afgerond.`;

  return (
    <div className="relative">
      {/* Same sunrise art as the auth screen, so opening the app and starting the day feel like one moment. */}
      <PageBanner src="/landing-header.webp" className="h-48" position="72% 35%" />
      <div className="relative px-5 pt-14 pb-6">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground mb-2 tracking-wide">{greeting.date}</p>
          <h1 className="text-[2.15rem] leading-[1.08] text-foreground font-medium font-display">
            {greeting.text}
          </h1>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{greeting.sub}</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32, delay: 0.05 }}
          className={`mt-5 rounded-[1.5rem] px-5 py-4 ${CARD_CHROME}`}
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
          {!swipeHint.seen && dagdelen.length > 0 && (
            <div
              className="flex items-start gap-3 rounded-2xl px-4 py-3 mb-3"
              style={{ background: "color-mix(in srgb, var(--accent) 20%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 36%, transparent)" }}>
              <p className="flex-1 text-xs text-foreground leading-relaxed">
                Veeg een taak naar rechts om af te vinken, naar links om uit te stellen. Tik voor details.
              </p>
              <IconButton
                size={8}
                tone="card"
                onClick={swipeHint.dismiss}
                label="Hint sluiten"
                icon={<X size={13} className="text-muted-foreground" aria-hidden="true" />}
              />
            </div>
          )}
          {plannedOpen.length === 0 ? (
            <Leeg
              icon="🌿"
              image="/empty-plants.webp"
              text={allDone ? "Alles rond voor vandaag. Geniet van de rust." : "Niets op de planning. Geniet ervan."}
            />
          ) : (
            <>
              {pickedUpToday.length > 0 && (
                <div className={`rounded-[1.6rem] p-4 mb-3 ${CARD_CHROME}`} style={{ boxShadow: "var(--shadow-card)" }}>
                  <div
                    className="inline-flex items-center gap-1.5 mb-2 px-3 py-1 rounded-full"
                    style={{ background: "color-mix(in srgb, var(--primary) 13%, transparent)" }}>
                    <Plus size={11} aria-hidden="true" style={{ color: SAGE }} />
                    <span className="text-[0.66rem] font-semibold tracking-wide uppercase" style={{ color: SAGE }}>
                      Vandaag opgepakt
                    </span>
                  </div>
                  <AnimatePresence mode="popLayout" initial={false}>
                    {pickedUpToday.map((task) => (
                      <TijdlijnTaakRij
                        key={task.id}
                        task={task}
                        onToggle={() => toggleTask(task.id, !task.done)}
                        onEdit={() => openEditTask(task.id)}
                        peek={!swipeHint.seen && task.id === firstTaskId}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
              {dagdelenNow.length > 0 && (
                <div className={`rounded-[1.6rem] p-4 ${CARD_CHROME}`} style={{ boxShadow: "var(--shadow-card)" }}>
                  <div className="space-y-5">
                    <AnimatePresence initial={false}>
                      {dagdelenNow.map(renderDagdeelGroep)}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </>
          )}
          {laterCount > 0 && (
            <div className="mt-3">
              <CollapsibleSection title="Later vandaag" count={laterCount} open={laterOpen} onToggle={() => setLaterOpen((v) => !v)}>
                <div className="space-y-5">
                  <AnimatePresence initial={false}>
                    {dagdelenLater.map(renderDagdeelGroep)}
                  </AnimatePresence>
                </div>
              </CollapsibleSection>
            </div>
          )}
        </section>

        {plannedDone.length > 0 && (
          <section>
            <CollapsibleSection
              title="Afgerond"
              count={plannedDone.length}
              icon={<Check size={13} style={{ color: SAGE }} aria-hidden="true" />}
              open={afgerondOpen}
              onToggle={() => setAfgerondOpen((v) => !v)}>
              <div className="space-y-1.5">
                {plannedDone.map((task) => {
                  const mine = !!task.doneById && task.doneById === me?.id;
                  return (
                    <div key={task.id} className="flex items-center gap-1.5">
                      <button
                        onClick={() => toggleTask(task.id, false)}
                        aria-label={`${task.title} als niet gedaan markeren`}
                        className="flex-1 min-w-0 flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-card text-left focus-ring">
                        <Avatar name={mine ? "Jij" : task.doneBy ?? "?"} size={28} tone={mine ? "solid" : "soft"} serif />
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm text-muted-foreground line-through truncate">{task.title}</span>
                          {task.doneBy && task.doneAt && (
                            <span className="block text-[0.68rem] text-muted-foreground/80 truncate">
                              {mine ? "Jij" : task.doneBy} · {task.doneAt}
                            </span>
                          )}
                        </span>
                        <span className="text-[0.66rem] flex-shrink-0 self-start" style={{ color: "color-mix(in srgb, var(--muted-foreground) 60%, transparent)" }}>terug</span>
                      </button>
                      <IconButton
                        size={8}
                        tone="card"
                        onClick={() => openEditTask(task.id)}
                        label={`${task.title} bewerken`}
                        icon={<Pencil size={13} className="text-muted-foreground" aria-hidden="true" />}
                      />
                    </div>
                  );
                })}
              </div>
            </CollapsibleSection>
          </section>
        )}

        {suggestions.length > 0 && (
          <section>
            <CollapsibleSection
              title="Misschien handig"
              count={suggestions.length}
              open={suggestiesOpen}
              onToggle={() => setSuggestiesOpen((v) => !v)}
              tone="active">
              <div className="space-y-2">
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
            </CollapsibleSection>
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

        <section>
          <Card onClick={() => navigate("/samen", { state: { from: "vandaag" } })} className="flex items-center gap-3.5 px-4 py-4" ariaLabel="Samen — wat huisgenoten vandaag deden">
            <IconBadge icon={<Heart size={16} />} size={36} />
            <span className="flex-1 min-w-0 text-left">
              <span className="inline-flex items-center gap-1.5">
                <span className="text-sm font-semibold text-foreground">Samen</span>
                {!!housemateActivity && (
                  <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: SAGE }} />
                )}
              </span>
              <span className="block text-xs text-muted-foreground mt-0.5 truncate">{samenSubtitle}</span>
            </span>
            <ChevronRight size={15} className="text-muted-foreground flex-shrink-0" aria-hidden="true" />
          </Card>
        </section>
      </div>
    </div>
  );
}
