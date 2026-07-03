import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CalendarDays, Heart, RefreshCw } from "lucide-react";
import { AppBackground } from "../../components/AppBackground";
import { PrimaryButton } from "../../components/shared";

interface Slide {
  icon: ReactNode;
  title: string;
  text: string;
}

// The three pillars (CLAUDE.md §1 / design brief §1) — same order as BottomNav.
const SLIDES: Slide[] = [
  {
    icon: <CalendarDays size={26} aria-hidden="true" />,
    title: "Vandaag",
    text: "Wat ga ik nu doen. Je planner-thuisbasis — kort en actiegericht.",
  },
  {
    icon: <RefreshCw size={26} aria-hidden="true" />,
    title: "Routines",
    text: "Terugkerende structuur en bundels van taken. Hier leeft de gewoontevorming.",
  },
  {
    icon: <Heart size={26} aria-hidden="true" />,
    title: "Samen",
    text: "Een afgevinkte taak is een bericht — \"ik heb de keuken al gedaan\" — geen logboek of scorebord.",
  },
];

/** Short, warm 3-screen intro shown once before "huishouden aanmaken" (design brief §4.6). */
export function OnboardingIntroPage({ onDone }: { onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const last = index === SLIDES.length - 1;
  const slide = SLIDES[index];

  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center bg-background"
      style={{
        paddingTop: "var(--safe-top)",
        paddingBottom: "var(--safe-bottom)",
        paddingLeft: "calc(1.5rem + var(--safe-left))",
        paddingRight: "calc(1.5rem + var(--safe-right))",
      }}
    >
      <AppBackground />
      <div className="w-full max-w-sm text-center relative z-10">
        <p className="sr-only" aria-live="polite">{slide.title}</p>
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22 }}
          >
            <div
              className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full"
              style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)", color: "var(--primary)" }}
              aria-hidden="true"
            >
              {slide.icon}
            </div>
            <h1 className="text-[1.75rem] font-medium text-foreground mb-2 font-display">
              {slide.title}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-[280px] mx-auto">{slide.text}</p>
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-center gap-1.5 mt-8 mb-8" aria-hidden="true">
          {SLIDES.map((_, i) => (
            <span
              key={i}
              className="h-1.5 rounded-full transition-[width,background-color]"
              style={{
                width: i === index ? "1.25rem" : "0.375rem",
                background: i === index ? "var(--primary)" : "color-mix(in srgb, var(--muted-foreground) 30%, transparent)",
              }}
            />
          ))}
        </div>

        <div className="space-y-3">
          <PrimaryButton onClick={() => (last ? onDone() : setIndex((i) => i + 1))}>
            {last ? "Aan de slag" : "Volgende"}
          </PrimaryButton>
          {!last && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onDone}
              className="w-full text-center text-sm text-muted-foreground py-1"
            >
              Overslaan
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}
