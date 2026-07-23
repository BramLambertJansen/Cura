/**
 * Static task templates — a quiet starting point for a new or empty room,
 * not a full checklist. 5-8 per category, no backend, composed via the
 * existing createTask (CLAUDE.md §5 "Taaktemplates en kamerstarter").
 */

export interface TaskTemplate {
  title: string;
  description?: string;
  durationMin?: number;
  intervalDays?: number;
}

export type TemplateCategory = "keuken" | "badkamer" | "woonkamer" | "slaapkamer" | "toilet" | "algemeen";

export const ROOM_TEMPLATES: Record<TemplateCategory, TaskTemplate[]> = {
  keuken: [
    { title: "Afwassen", durationMin: 10, intervalDays: 1 },
    { title: "Aanrecht schoonvegen", durationMin: 5, intervalDays: 1 },
    { title: "Vaatwasser in-/uitruimen", durationMin: 10, intervalDays: 1 },
    { title: "Vuilnis buiten zetten", durationMin: 5, intervalDays: 7 },
    { title: "Koelkast opruimen", description: "Nalopen op houdbaarheid", durationMin: 15, intervalDays: 14 },
    { title: "Fornuis schoonmaken", durationMin: 10, intervalDays: 7 },
  ],
  badkamer: [
    { title: "Douche schoonmaken", durationMin: 15, intervalDays: 7 },
    { title: "Wastafel schoonmaken", durationMin: 5, intervalDays: 7 },
    { title: "Spiegel poetsen", durationMin: 5, intervalDays: 14 },
    { title: "Handdoeken verversen", durationMin: 5, intervalDays: 7 },
    { title: "Vloer dweilen", durationMin: 10, intervalDays: 7 },
  ],
  woonkamer: [
    { title: "Stofzuigen", durationMin: 15, intervalDays: 7 },
    { title: "Stof afnemen", durationMin: 10, intervalDays: 7 },
    { title: "Kussens opschudden", durationMin: 5, intervalDays: 7 },
    { title: "Ramen zemen", durationMin: 15, intervalDays: 30 },
    { title: "Planten water geven", durationMin: 5, intervalDays: 7 },
    { title: "Opruimen", durationMin: 10, intervalDays: 1 },
  ],
  slaapkamer: [
    { title: "Bed verschonen", durationMin: 10, intervalDays: 7 },
    { title: "Stofzuigen", durationMin: 10, intervalDays: 7 },
    { title: "Was opvouwen", durationMin: 10, intervalDays: 7 },
    { title: "Kledingkast opruimen", durationMin: 15, intervalDays: 30 },
    { title: "Ramen luchten", durationMin: 5, intervalDays: 1 },
  ],
  toilet: [
    { title: "Wc-pot schoonmaken", durationMin: 5, intervalDays: 7 },
    { title: "Wc-bril reinigen", durationMin: 5, intervalDays: 7 },
    { title: "Prullenbak legen", durationMin: 2, intervalDays: 7 },
    { title: "Handdoek verversen", durationMin: 2, intervalDays: 7 },
    { title: "Vloer dweilen", durationMin: 5, intervalDays: 14 },
  ],
  algemeen: [
    { title: "Stofzuigen hele huis", durationMin: 20, intervalDays: 7 },
    { title: "Vuilnis buiten zetten", durationMin: 5, intervalDays: 7 },
    { title: "Brievenbus leegmaken", durationMin: 2, intervalDays: 2 },
    { title: "Was draaien", durationMin: 10, intervalDays: 3 },
    { title: "Boodschappen doen", durationMin: 30, intervalDays: 7 },
    { title: "Vloeren dweilen", durationMin: 15, intervalDays: 14 },
  ],
};

/** Best-guess category for a room, from its icon — falls back to "algemeen" for icon keys without a dedicated template list. */
export function categoryForIconKey(iconKey: string): TemplateCategory {
  switch (iconKey) {
    case "utensils": return "keuken";
    case "droplets": return "badkamer";
    case "toilet": return "toilet";
    case "sofa": return "woonkamer";
    case "bed": return "slaapkamer";
    default: return "algemeen";
  }
}
