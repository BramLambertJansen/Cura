import { create } from "zustand";
import { toast } from "sonner";
import { useCuraStore } from "./useCuraStore";

/**
 * Focustimer — een zachte, pomodoro-achtige focustimer.
 *
 * Deze store staat bewust LOS van `useCuraStore`: dat is de ene store voor
 * domein-entiteiten (via de DataStore, gedeeld met het huishouden). Een lopende
 * timer is puur vluchtige, apparaat-lokale UI-state — verwant aan de
 * `useNietVandaag`/`useReacties`-hooks in `src/app/lib/`, maar hij moet door
 * meerdere componenten tegelijk gedeeld worden (het focus-scherm, de mini-pill
 * en de tick-hook), dus een kleine losse Zustand-store i.p.v. een per-component
 * `useState`-hook.
 *
 * De tijd wordt afgeleid van een eind-timestamp (`endsAt`), niet afgeteld: zo
 * blijft de resterende tijd kloppen ook als de tab get. throttlet of de app even
 * dicht was. Alleen de mutaties (start/pause/…) schrijven naar localStorage —
 * de seconde-tick niet, want `endsAt` ligt al vast.
 *
 * Bewust géén rondes-teller, streak of "x pomodoro's vandaag" (CLAUDE.md §2).
 */

export type FocusPhase = "focus" | "break";
export type FocusStatus = "idle" | "running" | "paused";

/** Duur-presets (minuten) voor vrij gebruik, en de vaste korte pauze. */
export const FOCUS_PRESETS_MIN = [15, 25, 50] as const;
export const BREAK_MIN = 5;

const STORAGE_KEY = "cura:focus-timer";
const NOTIF_PREF_KEY = "cura:notif-pref";

interface Persisted {
  phase: FocusPhase;
  status: FocusStatus;
  /** Epoch ms waarop de huidige lopende fase afloopt; null als idle/paused. */
  endsAt: number | null;
  remainingSec: number;
  totalSec: number;
  taskId?: string;
  taskTitle?: string;
}

const IDLE: Persisted = {
  phase: "focus",
  status: "idle",
  endsAt: null,
  remainingSec: 0,
  totalSec: 0,
  taskId: undefined,
  taskTitle: undefined,
};

function persist(s: Persisted): void {
  try {
    const { phase, status, endsAt, remainingSec, totalSec, taskId, taskTitle } = s;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ phase, status, endsAt, remainingSec, totalSec, taskId, taskTitle }),
    );
  } catch {
    // localStorage kan ontbreken/vol zijn — een niet-bewaarde timer is geen ramp.
  }
}

function loadInitial(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return IDLE;
    const p = JSON.parse(raw) as Persisted;
    if (p.status === "running") {
      // Liep de timer al af terwijl de app dicht was? Val stil terug naar idle —
      // geen verouderde "focus voorbij"-melding uit het niets afvuren.
      if (p.endsAt == null || p.endsAt <= Date.now()) return { ...IDLE, phase: p.phase };
      return { ...p, remainingSec: Math.max(0, Math.round((p.endsAt - Date.now()) / 1000)) };
    }
    return { ...IDLE, ...p };
  } catch {
    return IDLE;
  }
}

/** Browser-melding als attentie wanneer de tab op de achtergrond staat; de toast
 * (met acties) blijft de interactieve route. Respecteert dezelfde meldingen-
 * voorkeur als de wekkers (`useTaskReminders`). */
function osNudge(title: string, body: string): void {
  try {
    if (localStorage.getItem(NOTIF_PREF_KEY) === "disabled") return;
  } catch {
    return;
  }
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  // Zichtbare tab → de toast volstaat; alleen nudgen als de gebruiker elders is.
  if (typeof document !== "undefined" && !document.hidden) return;
  try {
    new Notification(title, { body, tag: "cura-focus", icon: "/icons/icon-192.png" });
  } catch {
    // Sommige browsers vereisen een SW-registratie voor Notification — stil negeren.
  }
}

interface PomodoroState extends Persisted {
  /** Start een nieuwe fase. Zonder `phase` = een focussessie. */
  start: (opts: { totalSec: number; phase?: FocusPhase; taskId?: string; taskTitle?: string }) => void;
  pause: () => void;
  resume: () => void;
  addTime: (sec: number) => void;
  /** Stop en terug naar idle (presets). */
  reset: () => void;
  /** Vink de gekoppelde taak af én stop de timer. No-op op de taak zonder `taskId`. */
  completeLinkedTask: () => void;
  /** Eén seconde-tik: herberekent resterende tijd uit `endsAt`; bij ≤0 → afronden. */
  tick: () => void;
}

export const usePomodoroStore = create<PomodoroState>((set, get) => {
  function complete(): void {
    const { phase, taskId, taskTitle } = get();
    if (phase === "focus") {
      osNudge("Focus voorbij", taskTitle ? `Mooi gewerkt aan ${taskTitle.toLowerCase()}.` : "Mooi gewerkt.");
      const startBreak = () => get().start({ totalSec: BREAK_MIN * 60, phase: "break" });
      if (taskId) {
        toast("Focus voorbij", {
          description: `Mooi gewerkt aan ${taskTitle ?? "deze taak"}.`,
          action: { label: "Afvinken", onClick: () => useCuraStore.getState().toggleTask(taskId, true) },
          cancel: { label: "Korte pauze", onClick: startBreak },
        });
      } else {
        toast("Focus voorbij — mooi gewerkt.", {
          description: "Even lucht happen?",
          action: { label: "Korte pauze", onClick: startBreak },
        });
      }
    } else {
      osNudge("Pauze voorbij", "Klaar voor een volgende ronde?");
      toast("Pauze voorbij", { description: "Klaar voor een volgende ronde wanneer jij wilt." });
    }
    set({ ...IDLE, phase: "focus" });
    persist(get());
  }

  return {
    ...loadInitial(),

    start: ({ totalSec, phase = "focus", taskId, taskTitle }) => {
      const safeSec = Math.max(1, Math.round(totalSec));
      set({
        phase,
        status: "running",
        endsAt: Date.now() + safeSec * 1000,
        remainingSec: safeSec,
        totalSec: safeSec,
        taskId,
        taskTitle,
      });
      persist(get());
    },

    pause: () => {
      const s = get();
      if (s.status !== "running") return;
      const remaining = s.endsAt ? Math.max(0, Math.round((s.endsAt - Date.now()) / 1000)) : s.remainingSec;
      set({ status: "paused", endsAt: null, remainingSec: remaining });
      persist(get());
    },

    resume: () => {
      const s = get();
      if (s.status !== "paused") return;
      set({ status: "running", endsAt: Date.now() + s.remainingSec * 1000 });
      persist(get());
    },

    addTime: (sec) => {
      const s = get();
      if (s.status === "idle") return;
      set({
        totalSec: s.totalSec + sec,
        remainingSec: s.remainingSec + sec,
        endsAt: s.status === "running" && s.endsAt ? s.endsAt + sec * 1000 : s.endsAt,
      });
      persist(get());
    },

    reset: () => {
      set({ ...IDLE, phase: "focus" });
      persist(get());
    },

    completeLinkedTask: () => {
      const { taskId } = get();
      // toggleTask (useCuraStore) toont zelf de énige afvink-toast — hier geen tweede.
      if (taskId) useCuraStore.getState().toggleTask(taskId, true);
      set({ ...IDLE, phase: "focus" });
      persist(get());
    },

    tick: () => {
      const s = get();
      if (s.status !== "running" || s.endsAt == null) return;
      const remaining = Math.max(0, Math.round((s.endsAt - Date.now()) / 1000));
      if (remaining <= 0) {
        complete();
        return;
      }
      set({ remainingSec: remaining });
    },
  };
});
