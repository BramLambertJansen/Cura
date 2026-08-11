/**
 * The shared "how long does this take" filter bucket — three fixed windows plus
 * "alles". Originally lived only in HuisPage; Takenoverzicht needs the exact same
 * buckets/labels, so this is the one place both filter on (CLAUDE.md's drift-avoidance
 * pattern, same class as MAX_TASK_INTERVAL_DAYS/#152-#154 — two independent copies of
 * "what counts as kort/middel/lang" could silently disagree).
 */
export type DurationFilter = "alles" | "kort" | "middel" | "lang";

export function durationMatches(durationMin: number | undefined, filter: DurationFilter): boolean {
  if (filter === "alles") return true;
  if (durationMin === undefined) return false;
  if (filter === "kort") return durationMin <= 15;
  if (filter === "middel") return durationMin > 15 && durationMin <= 45;
  return durationMin > 45;
}

export const DURATION_LABELS: Record<DurationFilter, string> = {
  alles: "Alle duur",
  kort: "≤ 15 min",
  middel: "15–45 min",
  lang: "45+ min",
};

/**
 * The four duration chips in filter-option order, for the shared FilterPanel
 * (shared.tsx) — "Alles" here rather than DURATION_LABELS.alles ("Alle duur"),
 * matching the reset-option wording every other FilterPanel group uses (Huis'
 * kamer group, Takenoverzicht's). Huis and Takenoverzicht both render this
 * exact list instead of each hand-rolling their own four KeuzeChips.
 */
export const DURATION_FILTER_OPTIONS: { id: DurationFilter; label: string }[] = [
  { id: "alles", label: "Alles" },
  { id: "kort", label: DURATION_LABELS.kort },
  { id: "middel", label: DURATION_LABELS.middel },
  { id: "lang", label: DURATION_LABELS.lang },
];
