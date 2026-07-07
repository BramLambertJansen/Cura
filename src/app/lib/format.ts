const DAY_NL = ["Zondag", "Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag"];
const MON_NL = [
  "januari", "februari", "maart", "april", "mei", "juni",
  "juli", "augustus", "september", "oktober", "november", "december",
];

export function getGreeting() {
  const h = new Date().getHours();
  const d = new Date();
  const date = `${DAY_NL[d.getDay()]}, ${d.getDate()} ${MON_NL[d.getMonth()]}`;
  if (h >= 6 && h < 12) return { text: "Goedemorgen", sub: "Rustig aan, stap voor stap.", date };
  if (h >= 12 && h < 17) return { text: "Goedemiddag", sub: "Een taak per keer.", date };
  if (h >= 17 && h < 21) return { text: "Goedenavond", sub: "Fijn dat je er bent.", date };
  return { text: "Goedenacht", sub: "Stil in huis.", date };
}

export function intervalLabel(days: number): string {
  if (days === 1) return "Dagelijks";
  if (days === 2) return "Om de dag";
  if (days === 7) return "Wekelijks";
  if (days === 14) return "Elke 2 weken";
  if (days === 30) return "Maandelijks";
  return `Elke ${days} dagen`;
}

/** Countdown as m:ss for the focustimer — clamps to zero, never negative. */
export function formatCountdown(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

/** Soft household-status line for Samen — never a count, streak or comparison, just a warm read of the day so far. */
export function householdStatusLine(completedTodayCount: number): string {
  return completedTodayCount > 0 ? "Er is vandaag al wat lucht gemaakt" : "Rustige dag tot nu toe";
}

/** Derives a routine's completion-window cadence + label from its trigger id (used by Nieuw/Bewerk routine sheets). */
export function cadenceAndLabel(triggerId: string): { cadence: "daily" | "weekly"; windowLabel: string } {
  if (["ochtend", "middag", "avond", "dagelijks"].includes(triggerId)) {
    return { cadence: "daily", windowLabel: triggerId === "dagelijks" ? "dagen" : triggerId + "en" };
  }
  return { cadence: "weekly", windowLabel: triggerId === "weekend" ? "weekenden" : "weken" };
}
