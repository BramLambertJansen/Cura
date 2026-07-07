import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Coffee, Pause, Play, Plus, RotateCcw, Timer } from "lucide-react";
import { FOCUS_PRESETS_MIN, usePomodoroStore } from "../../../stores/usePomodoroStore";
import { fadeUp, stagger } from "../../lib/motion";
import { PageBanner } from "../../components/PageBanner";
import { TimerDisplay } from "../../components/TimerDisplay";
import { DubbelKnop, IconButton, OptieKaart, PillButton, PrimaryButton } from "../../components/shared";

/**
 * Focustimer-scherm — een zachte, pomodoro-achtige timer voor vrij gebruik of
 * gestart vanaf een taak. Idle toont duur-presets; lopend/gepauzeerd toont de
 * grote ring + m:ss met pauze/hervat, +5 min en stoppen. Alle state leeft in
 * `usePomodoroStore` (blijft lopen bij tabwissel); dit scherm componeert alleen
 * de bestaande primitieven (CLAUDE.md §7).
 */
export function FocusPage() {
  const status = usePomodoroStore((s) => s.status);
  const phase = usePomodoroStore((s) => s.phase);
  const remainingSec = usePomodoroStore((s) => s.remainingSec);
  const totalSec = usePomodoroStore((s) => s.totalSec);
  const taskTitle = usePomodoroStore((s) => s.taskTitle);
  const taskId = usePomodoroStore((s) => s.taskId);
  const start = usePomodoroStore((s) => s.start);
  const pause = usePomodoroStore((s) => s.pause);
  const resume = usePomodoroStore((s) => s.resume);
  const reset = usePomodoroStore((s) => s.reset);
  const addTime = usePomodoroStore((s) => s.addTime);
  const completeLinkedTask = usePomodoroStore((s) => s.completeLinkedTask);

  const [presetMin, setPresetMin] = useState<number>(25);
  // Afvinken is een klein, betekenisvol moment (§1/§5) — vraag een bevestiging.
  const [confirmFinish, setConfirmFinish] = useState(false);

  const idle = status === "idle";
  const running = status === "running";

  // Zodra de sessie eindigt (of z'n taak-koppeling verliest) heeft de bevestiging
  // geen betekenis meer — sluit hem, zodat hij niet blijft hangen bij een nieuwe sessie.
  useEffect(() => {
    if (idle || !taskId) setConfirmFinish(false);
  }, [idle, taskId]);

  return (
    <div className="relative min-h-full">
      <PageBanner src="/landing-header.webp" className="h-44" position="72% 35%" />

      <div className="relative px-5 pt-14 pb-10">
        <div className="mb-2">
          <p className="text-xs font-medium text-muted-foreground mb-2 tracking-wide">Focustimer</p>
          <h1 className="text-[2.15rem] leading-[1.08] text-foreground font-medium font-display">
            {idle ? "Even bij één ding blijven" : phase === "break" ? "Momentje pauze" : "Aan het werk"}
          </h1>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            {idle
              ? "Kies een tijd en houd het rustig bij deze ene taak."
              : taskTitle
                ? `Bezig met ${taskTitle}.`
                : "Blijf even hier — de timer loopt door terwijl je rondkijkt."}
          </p>
        </div>

        {idle ? (
          <motion.div variants={stagger} initial="initial" animate="animate" className="mt-8 space-y-6">
            <motion.div variants={fadeUp}>
              <div role="group" aria-label="Kies een focusduur" className="grid grid-cols-3 gap-3">
                {FOCUS_PRESETS_MIN.map((min) => (
                  <OptieKaart
                    key={min}
                    selected={presetMin === min}
                    onClick={() => setPresetMin(min)}
                    ariaLabel={`${min} minuten`}
                    className="py-5 flex flex-col items-center gap-0.5">
                    <span className="text-2xl font-medium text-foreground font-display leading-none">{min}</span>
                    <span className="text-xs text-muted-foreground">min</span>
                  </OptieKaart>
                ))}
              </div>
            </motion.div>
            <motion.div variants={fadeUp}>
              <PrimaryButton
                icon={<Timer size={16} aria-hidden="true" />}
                onClick={() => start({ totalSec: presetMin * 60, phase: "focus" })}>
                Start focus
              </PrimaryButton>
            </motion.div>
          </motion.div>
        ) : (
          <div className="mt-10 flex flex-col items-center gap-9">
            <TimerDisplay remainingSec={remainingSec} totalSec={totalSec} phase={phase} />

            <div className="flex items-center gap-3">
              <PillButton icon={<Plus size={13} aria-hidden="true" />} onClick={() => addTime(5 * 60)}>
                5 min
              </PillButton>
              <IconButton
                size={10}
                tone="card"
                onClick={reset}
                label="Timer stoppen"
                icon={<RotateCcw size={16} className="text-muted-foreground" aria-hidden="true" />}
              />
            </div>

            <div className="w-full max-w-xs space-y-3">
              <PrimaryButton
                icon={running ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
                onClick={() => (running ? pause() : resume())}>
                {running ? "Pauzeer" : "Hervat"}
              </PrimaryButton>

              {/* Vanaf een taak gestart: rond hem hier af — dat stopt de timer én
                  vinkt de taak af, met een bevestiging ertussen. */}
              {taskId && (
                <AnimatePresence mode="wait" initial={false}>
                  {confirmFinish ? (
                    <motion.div key="confirm" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-2.5">
                      <p className="text-center text-xs text-muted-foreground">
                        {taskTitle ? `${taskTitle} afvinken en stoppen?` : "Taak afvinken en de timer stoppen?"}
                      </p>
                      <DubbelKnop
                        onCancel={() => setConfirmFinish(false)}
                        onConfirm={completeLinkedTask}
                        label="Ja, afvinken"
                      />
                    </motion.div>
                  ) : (
                    <motion.div key="trigger" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex justify-center">
                      <PillButton icon={<Check size={13} aria-hidden="true" />} onClick={() => setConfirmFinish(true)}>
                        Taak afvinken
                      </PillButton>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>

            {phase === "break" && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground -mt-4">
                <Coffee size={12} aria-hidden="true" /> Even lucht happen — geen haast.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
