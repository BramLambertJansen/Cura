import { motion, AnimatePresence } from "motion/react";
import { useCuraStore } from "../../../stores/useCuraStore";
import { useRoutineViews, useTaskViews } from "../../../stores/useViews";
import { getGreeting } from "../../lib/format";
import { spring, stagger, fadeUp } from "../../lib/motion";
import { Avatar, Kop, Leeg } from "../../components/shared";
import { TaakRij } from "../../components/TaakRij";
import { RoutineKaartCompact } from "../../components/RoutineKaart";
import { useSheets } from "../../sheetContext";

export function VandaagPage() {
  const { openProfiel, openEditTask } = useSheets();
  const toggleTask = useCuraStore((s) => s.toggleTask);
  const members = useCuraStore((s) => s.members);
  const currentUserId = useCuraStore((s) => s.currentUserId);
  const tasks = useTaskViews();
  const routines = useRoutineViews();

  const greeting = getGreeting();
  const plannedOpen = tasks.filter((t) => t.planned && !t.done);
  const plannedDone = tasks.filter((t) => t.planned && t.done);
  const allPlanned = [...plannedDone, ...plannedOpen];

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
        <AnimatePresence>
          {huisgenootActivity.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={spring}>
              <div className="flex items-start gap-3 rounded-2xl px-4 py-3.5" style={{ background: "color-mix(in srgb, var(--accent) 22%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 40%, transparent)" }}>
                <div className="mt-0.5">
                  <Avatar name={huisgenootActivity[0].doneBy!} size={32} tone="soft" />
                </div>
                <div className="space-y-0.5">
                  {huisgenootActivity.map((t) => (
                    <p key={t.id} className="text-sm text-foreground leading-snug">
                      <span className="font-semibold">{t.doneBy}</span> heeft {t.title.toLowerCase()} gedaan
                      {t.doneAt && <span className="text-muted-foreground"> · {t.doneAt}</span>}
                    </p>
                  ))}
                </div>
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
                    <TaakRij task={task} onToggle={() => toggleTask(task.id, !task.done)} onEdit={() => openEditTask(task.id)} />
                  </motion.div>
                ))}
              </motion.div>
          }
        </section>

        <section>
          <Kop>Routines van vandaag</Kop>
          <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-3">
            {routines.slice(0, 2).map((r) => (
              <motion.div key={r.id} variants={fadeUp}>
                <RoutineKaartCompact routine={r} onToggleTask={(taskId) => {
                  const t = r.tasks.find((x) => x.id === taskId);
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
