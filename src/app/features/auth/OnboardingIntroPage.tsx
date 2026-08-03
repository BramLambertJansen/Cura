import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CalendarDays, Check, Heart, Home } from "lucide-react";
import { AppBackground } from "../../components/AppBackground";
import { PrimaryButton } from "../../components/shared";

interface Slide {
  icon: ReactNode;
  title: string;
  text: string;
  /** Concrete, scannable "dit kun je hier doen"-punten onder de tekst. */
  bullets?: string[];
}

/**
 * Slide 1 says in plain words wat de app is en wat je erin kunt doen; de drie
 * daarna lopen de pijlers (CLAUDE.md §1) langs in dezelfde volgorde als de
 * navigatie, elk met wat je er concreet doet — geen abstracte omschrijving van
 * het idee erachter.
 */
const SLIDES: Slide[] = [
  {
    icon: <Check size={26} aria-hidden="true" />,
    title: "Welkom bij Cura",
    text: "Cura is een huishoudplanner die je deelt met je huisgenoot. Eén lijst voor jullie samen, in plaats van onthouden wie wat wanneer doet.",
    bullets: [
      "Taken per kamer bijhouden",
      "Routines die automatisch terugkomen",
      "Een gedeelde boodschappenlijst",
      "Zien wat de ander al heeft gedaan",
    ],
  },
  {
    icon: <CalendarDays size={26} aria-hidden="true" />,
    title: "Vandaag",
    text: "Je lijstje voor vandaag, op ochtend, middag en avond.",
    bullets: [
      "Veeg naar rechts om af te vinken",
      "Veeg naar links om iets uit te stellen",
      "Tik op + om een taak of boodschap toe te voegen",
    ],
  },
  {
    icon: <Home size={26} aria-hidden="true" />,
    title: "Huis en Routines",
    text: "Onder Huis staan alle taken van het huishouden, per kamer. Een routine is een groepje taken dat je vaak samen doet.",
    bullets: [
      "Pak een taak op zodat de ander ziet dat jij hem doet",
      "Start een routine en loop de taken één voor één af",
    ],
  },
  {
    icon: <Heart size={26} aria-hidden="true" />,
    title: "Samen",
    text: "Wat jij afvinkt, ziet je huisgenoot direct terug onder Samen. Geen scorebord — je hoeft alleen niet meer te vragen of de keuken al gedaan is.",
  },
];

/** Eenmalige intro vóór "huishouden aanmaken": wat de app is en wat je erin kunt doen. */
export function OnboardingIntroPage({ onDone }: { onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const last = index === SLIDES.length - 1;
  const slide = SLIDES[index];

  return (
    <div
      className="min-h-dvh max-h-dvh overflow-y-auto flex flex-col items-center justify-center bg-background"
      style={{
        paddingTop: "calc(2rem + var(--safe-top))",
        paddingBottom: "calc(2rem + var(--safe-bottom))",
        paddingLeft: "calc(1.5rem + var(--safe-left))",
        paddingRight: "calc(1.5rem + var(--safe-right))",
      }}
    >
      <AppBackground />
      {/* my-auto (i.p.v. alleen justify-center op de scroller) zodat een lange
          slide op een klein scherm van bovenaf scrollt in plaats van de kop af
          te snijden. */}
      <div className="w-full max-w-sm text-center relative z-10 my-auto">
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
            <p className="text-sm text-muted-foreground leading-relaxed max-w-[300px] mx-auto">{slide.text}</p>
            {slide.bullets && (
              <ul className="mt-5 space-y-2 text-left max-w-[300px] mx-auto">
                {slide.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2.5 text-sm text-foreground leading-snug">
                    <span
                      className="mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0"
                      style={{ background: "var(--primary)" }}
                      aria-hidden="true"
                    />
                    {b}
                  </li>
                ))}
              </ul>
            )}
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
