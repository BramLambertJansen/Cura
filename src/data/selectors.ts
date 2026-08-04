import type {
  Task,
  TaskCompletion,
  Room,
  Bundle,
  Member,
  ShoppingItem,
  TaskView,
  RoomView,
  RoutineView,
  ActivityView,
  TaskOverview,
  DagdeelGroup,
  ShoppingItemView,
  ShoppingListView,
  ShoppingCategoryKey,
  ShoppingUnitKey,
} from "./types";
import { buildLatestCompletionMap, isDone, getDueReminders } from "./reminders";

/**
 * SELECTORS — derive view-models from the normalized domain.
 *
 * This is where the product principles become code:
 *   - "Honesty over precision": hints are soft phrases, never exact day counts.
 *   - "Degrades gracefully": missing completion data yields a neutral hint, not a crash.
 *   - "No streaks": density is a ratio over a rolling window; a miss is a dip, not a reset.
 *   - "Task is the single source of truth": done/density are computed here, never stored.
 *
 * All functions are pure: (domain data) -> (view-model). Easy to test against the
 * phase "proves" questions, and trivial to memoize in a Zustand selector later.
 *
 * The reminder engine (buildLatestCompletionMap / isDone / getDueReminders /
 * DueReminder) lives in ./reminders — pure and framework-free so it can be
 * shared with the server-side push scheduler. It is re-exported here so
 * existing call-sites that import from "./selectors" keep working unchanged.
 */
export { buildLatestCompletionMap, getDueReminders };
export type { DueReminder } from "./reminders";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DAY_MS = 86_400_000;

/**
 * The longest interval a recurring task can be given (IntervalKiezer's own
 * input clamp — kept here, not duplicated, so the two can't drift). Anything
 * that needs "far enough back to still find a task's last completion" — e.g.
 * useCuraStore's bounded `since` fetch (#154) — must look back at least this
 * far, or a legitimately once-a-year task would read as never-done the
 * moment its one completion ages past a shorter window.
 */
export const MAX_TASK_INTERVAL_DAYS = 365;

const memberName = (members: Member[], id?: string): string | undefined =>
  id ? members.find((m) => m.id === id)?.displayName : undefined;

const formatDuration = (min?: number): string | undefined =>
  min ? `${min} min` : undefined;

const formatTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });

// ─── Task "done" + soft due hint ─────────────────────────────────────────────
// `isDone` and `buildLatestCompletionMap` now live in ./reminders (shared with
// the server scheduler) and are imported above.

/**
 * Soft due hint for a recurring task. Returns a PHRASE, never "5 dagen geleden".
 * Degrades gracefully: no interval or no completion -> undefined (neutral).
 *
 * Maps fraction-of-interval-elapsed to gentle language:
 *   < 0.5  -> "Nog even goed"
 *   < 1.0  -> "Bijna weer toe"
 *   >= 1.0 -> "Waarschijnlijk weer toe"
 */
function dueHint(task: Task, latest?: TaskCompletion, now = Date.now()): string | undefined {
  if (!task.intervalDays) return undefined;
  if (!latest) return "Waarschijnlijk weer toe"; // never done -> gently surface it
  // Callers only ever call this once isDone() already said "not done", and for
  // a daily task that resets at local midnight (reminders.ts), not-done means
  // due right now regardless of how recently it was ticked off yesterday — the
  // rolling-fraction gradient below only makes sense for a multi-day interval.
  if (task.intervalDays === 1) return "Waarschijnlijk weer toe";
  const fraction = (now - new Date(latest.completedAt).getTime()) / (task.intervalDays * DAY_MS);
  if (fraction < 0.5) return "Nog even goed";
  if (fraction < 1) return "Bijna weer toe";
  return "Waarschijnlijk weer toe";
}

function wekkerLabel(task: Task): string | undefined {
  if (!task.dueDate) return undefined;
  const d = new Date(task.dueDate);
  const time = d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
  if (task.intervalDays) return `Wekker om ${time}`;
  const dateLabel = d.toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" });
  return `${dateLabel}, ${time}`;
}

export function toTaskView(
  task: Task,
  latestByTask: Map<string, TaskCompletion>,
  rooms: Room[],
  members: Member[],
  now = Date.now(),
  timeZone?: string,
): TaskView {
  const latest = latestByTask.get(task.id);
  const done = isDone(task, latest, now, timeZone);
  // A recurring task's startedAt otherwise survives every interval reset, so
  // without this check a task "bezig" two cycles ago would show "bezig" again
  // the moment it becomes due, despite never having been (re)started this cycle.
  const startedThisCycle = !!task.startedAt
    && (!latest || new Date(task.startedAt).getTime() > new Date(latest.completedAt).getTime());
  const checklistItems = task.checklistItems ?? [];
  const checklistProgress = checklistItems.length > 0
    ? { done: checklistItems.filter((i) => i.checked).length, total: checklistItems.length }
    : undefined;
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    roomId: task.roomId,
    room: rooms.find((r) => r.id === task.roomId)?.name,
    duration: formatDuration(task.durationMin),
    durationMin: task.durationMin,
    intervalDays: task.intervalDays,
    planned: task.planned,
    done,
    doneBy: done ? memberName(members, latest?.completedById) : undefined,
    doneById: done ? latest?.completedById : undefined,
    doneAt: done && latest ? formatTime(latest.completedAt) : undefined,
    claimedBy: memberName(members, task.claimedById),
    claimedById: task.claimedById,
    pickedUpAt: task.pickedUpAt,
    dueHint: done ? undefined : dueHint(task, latest, now),
    dueDate: task.dueDate,
    dagdeel: task.dagdeel,
    wekkerLabel: wekkerLabel(task),
    startedAt: task.startedAt,
    status: done ? "klaar" : startedThisCycle ? "bezig" : "open",
    checklistItems,
    checklistProgress,
  };
}

// ─── Room view + soft room hint ──────────────────────────────────────────────

/**
 * A room's hint is the gentlest of its tasks' states: if anything is clearly due,
 * say so softly; otherwise reassure. No counts, no timestamps.
 */
export function toRoomView(
  room: Room,
  tasks: Task[],
  latestByTask: Map<string, TaskCompletion>,
  members: Member[],
  now = Date.now(),
  timeZone?: string,
): RoomView {
  const roomTasks = tasks
    .filter((t) => t.roomId === room.id)
    .map((t) => toTaskView(t, latestByTask, [room], members, now, timeZone));
  const openCount = roomTasks.filter((t) => !t.done).length;
  const anyDue = roomTasks.some((t) => t.dueHint === "Waarschijnlijk weer toe");
  return {
    id: room.id,
    name: room.name,
    iconKey: room.iconKey,
    color: room.color,
    tasks: roomTasks,
    openCount,
    hint: anyDue ? "Waarschijnlijk weer toe aan een beurt" : "Nog even goed",
  };
}

// ─── Routine density — ratio over a rolling window, NEVER a streak ───────────

const PARTIAL_THRESHOLD = 1; // a period "counts" if >= this many bundle tasks were done
const DAILY_WINDOW = 14; // last 14 days
const WEEKLY_WINDOW = 8; // last 8 weeks

/** Key a completion into its period bucket (yyyy-mm-dd for daily, Monday-date for weekly). */
function periodKey(iso: string, cadence: "daily" | "weekly"): string {
  const d = new Date(iso);
  if (cadence === "daily") return d.toISOString().slice(0, 10);
  // Monday-aligned week bucket: find the Monday of the week containing d.
  // Using the Monday's date as the key is stable across year/DST boundaries and
  // never splits a calendar week between two buckets the way days-since-Jan-1 does.
  const day = d.getDay(); // 0 = Sun, 1 = Mon, …, 6 = Sat
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().slice(0, 10);
}

/**
 * Density: of the last N periods, in how many did the routine clear the
 * (soft) threshold? Partial progress counts; a missed period is just a lower
 * ratio, never a reset. Returns the numbers behind "11 van de 14 ochtenden".
 */
/**
 * Groups completions by the bundle their task belongs to, one pass over
 * tasks + completions — so toRoutineView (below) can be handed just its own
 * bundle's completions instead of re-scanning the full, unboundedly-growing
 * completions array once per bundle (#172).
 */
export function groupCompletionsByBundle(tasks: Task[], completions: TaskCompletion[]): Map<string, TaskCompletion[]> {
  const taskToBundle = new Map<string, string>();
  for (const t of tasks) if (t.bundleId) taskToBundle.set(t.id, t.bundleId);
  const out = new Map<string, TaskCompletion[]>();
  for (const c of completions) {
    const bundleId = taskToBundle.get(c.taskId);
    if (!bundleId) continue;
    const list = out.get(bundleId);
    if (list) list.push(c);
    else out.set(bundleId, [c]);
  }
  return out;
}

export function toRoutineView(
  bundle: Bundle,
  tasks: Task[],
  /** Already scoped to this bundle's tasks — see groupCompletionsByBundle. */
  bundleCompletions: TaskCompletion[],
  latestByTask: Map<string, TaskCompletion>,
  members: Member[],
  now = Date.now(),
  timeZone?: string,
): RoutineView {
  const windowSize = bundle.cadence === "daily" ? DAILY_WINDOW : WEEKLY_WINDOW;
  const periodMs = (bundle.cadence === "daily" ? 1 : 7) * DAY_MS;
  const cutoff = now - windowSize * periodMs;

  // Count bundle-task completions per period within the window, and track the
  // routine's earliest activity so a young routine isn't judged against a full
  // window it never had the chance to fill.
  const perPeriod = new Map<string, number>();
  let earliestMs = Infinity;
  for (const c of bundleCompletions) {
    const ms = new Date(c.completedAt).getTime();
    if (ms < earliestMs) earliestMs = ms;
    if (ms < cutoff) continue;
    const key = periodKey(c.completedAt, bundle.cadence);
    perPeriod.set(key, (perPeriod.get(key) ?? 0) + 1);
  }
  const doneInWindow = [...perPeriod.values()].filter((n) => n >= PARTIAL_THRESHOLD).length;

  // Denominator = the periods the routine has actually existed for, capped at
  // the window. A brand-new routine (no completions yet) has age 0, so the hint
  // reads "Pas begonnen" rather than "0 van 14 — glipt eruit"; a perfectly kept
  // 3-week-old routine reads "3 van 3", not a discouraging "3 van 8" (CLAUDE.md §2).
  const agePeriods = earliestMs === Infinity ? 0 : Math.floor((now - earliestMs) / periodMs) + 1;
  const effectiveWindow = Math.min(windowSize, Math.max(agePeriods, doneInWindow));

  return {
    id: bundle.id,
    name: bundle.name,
    trigger: bundle.trigger,
    tasks: tasks
      .filter((t) => t.bundleId === bundle.id)
      .map((t) => toTaskView(t, latestByTask, [], members, now, timeZone)),
    doneInWindow,
    windowSize: effectiveWindow,
    windowLabel: bundle.windowLabel,
    hint: densityHint(doneInWindow, effectiveWindow),
  };
}

/**
 * Zegt in gewone woorden hoe vaak de routine de laatste tijd doorging — het
 * losse cijfer ("11 van de 14 ochtenden") staat er in de UI naast. Nooit
 * bestraffend, maar ook niet vaag: "regelmatig" is te lezen, "zit lekker in
 * je ritme" is een gevoel dat de data niet claimt.
 */
function densityHint(done: number, total: number): string {
  if (total === 0) return "Deze routine is nieuw";
  const ratio = done / total;
  if (ratio >= 0.75) return "Gaat bijna elke keer door";
  if (ratio >= 0.4) return "Gaat regelmatig door";
  return "Ging de laatste tijd vaak niet door";
}

// ─── Vandaag suggestions — manual, no AI ─────────────────────────────────────

/** A quick task (≤ this many minutes) can be gently offered as "past goed tussendoor". */
const TUSSENDOOR_MAX_MIN = 10;

/**
 * Candidate tasks that could be handy to plan today: not already on today's
 * plan, still open, and one of three gentle classes —
 *   - softly due (`dueHint` says "Waarschijnlijk weer toe"),
 *   - carrying a wekker/dueDate, or
 *   - short enough to slot in between things (`durationMin` ≤ TUSSENDOOR_MAX_MIN,
 *     the "past goed tussendoor"-class).
 * Sorted shortest-duration-first (a gentle, optional nudge — never a priority
 * ranking) with unknown-duration tasks trailing. No AI, no external calls —
 * pure derivation from data already in the domain.
 */
export function toSuggestions(tasks: TaskView[], limit = 4): TaskView[] {
  const candidates = tasks.filter(
    (t) =>
      !t.planned &&
      !t.done &&
      (t.dueHint === "Waarschijnlijk weer toe" ||
        t.dueDate !== undefined ||
        (t.durationMin !== undefined && t.durationMin <= TUSSENDOOR_MAX_MIN)),
  );
  return [...candidates]
    .sort((a, b) => suggestionDurationMin(a) - suggestionDurationMin(b))
    .slice(0, limit);
}

function suggestionDurationMin(task: TaskView): number {
  return task.durationMin ?? Number.MAX_SAFE_INTEGER;
}

// ─── Task overview — open tasks bucketed by date status ──────────────────────

/**
 * Split open tasks into calm date-based buckets for the Takenoverzicht screen.
 * The one-off tasks split by their `dueDate`: `overdue` (deadline passed),
 * `upcoming` (now or later), `undated` (no wekker at all). Recurring tasks form
 * one `recurring` group — an open recurring task is due again *by definition*
 * (one completed within its interval counts as done and is filtered out here),
 * so it needs no further date split. Pure derivation from `TaskView`, `now`
 * injectable for tests.
 */
export function toTaskOverview(tasks: TaskView[], now = Date.now()): TaskOverview {
  const open = tasks.filter((t) => !t.done);
  const dueMs = (t: TaskView) => new Date(t.dueDate as string).getTime();
  return {
    overdue: open.filter((t) => !t.intervalDays && !!t.dueDate && dueMs(t) < now),
    recurring: open.filter((t) => !!t.intervalDays),
    upcoming: open.filter((t) => !t.intervalDays && !!t.dueDate && dueMs(t) >= now),
    undated: open.filter((t) => !t.intervalDays && !t.dueDate),
  };
}

// ─── Vandaag timeline — soft dagdeel grouping, never invented ────────────────

const DAGDEEL_LABELS: Record<DagdeelGroup["key"], string> = {
  ochtend: "Ochtend",
  middag: "Middag",
  avond: "Avond",
  overig: "Overig",
};

/** Which dagdeel a given hour-of-day falls in — the same three-way split the routine trigger options already use ('s Ochtends / 's Middags / 's Avonds). */
export function dagdeelForHour(hour: number): "ochtend" | "middag" | "avond" {
  if (hour < 12) return "ochtend";
  if (hour < 18) return "middag";
  return "avond";
}

/**
 * Groups open tasks into Ochtend/Middag/Avond for Vandaag's timeline layout.
 * A task's own explicit `dagdeel` tag (user-chosen, independent of the
 * wekker) wins when present; otherwise a real wekker/dueDate derives it from
 * that exact time. Everything else lands in `overig` instead of being
 * falsely assigned a moment the data has no signal for. Empty groups are
 * omitted; order is always ochtend → middag → avond → overig.
 */
export function toDagdelen(tasks: TaskView[]): DagdeelGroup[] {
  const buckets: Record<DagdeelGroup["key"], TaskView[]> = { ochtend: [], middag: [], avond: [], overig: [] };
  for (const t of tasks) {
    const key = t.dagdeel ?? (t.dueDate ? dagdeelForHour(new Date(t.dueDate).getHours()) : "overig");
    buckets[key].push(t);
  }
  return (["ochtend", "middag", "avond", "overig"] as const)
    .map((key) => ({ key, label: DAGDEEL_LABELS[key], tasks: buckets[key] }))
    .filter((g) => g.tasks.length > 0);
}

const DAGDEEL_ORDER: Record<"ochtend" | "middag" | "avond", number> = { ochtend: 0, middag: 1, avond: 2 };

/**
 * Splits `toDagdelen`'s groups around the current dagdeel so Vandaag can keep
 * only what's relevant to now front and center, tucking dagdelen that are
 * still ahead of us behind a "Later vandaag" toggle. `overig` carries no time
 * signal (no dueDate at all), so it never counts as "later" — it always stays
 * in `dagdelenNow`.
 */
export function splitDagdelen(
  dagdelen: DagdeelGroup[],
  nuDagdeel: "ochtend" | "middag" | "avond",
): { dagdelenNow: DagdeelGroup[]; dagdelenLater: DagdeelGroup[] } {
  const dagdelenNow: DagdeelGroup[] = [];
  const dagdelenLater: DagdeelGroup[] = [];
  for (const g of dagdelen) {
    if (g.key !== "overig" && DAGDEEL_ORDER[g.key] > DAGDEEL_ORDER[nuDagdeel]) {
      dagdelenLater.push(g);
    } else {
      dagdelenNow.push(g);
    }
  }
  return { dagdelenNow, dagdelenLater };
}

/**
 * Pulls tasks claimed today straight from a Huis room's pool out of the
 * normal dagdeel timeline into their own "Vandaag opgepakt" group — a
 * spontaneous pickup reads differently from something that was planned ahead,
 * and shouldn't be buried in "Overig" next to it.
 *
 * `pickedUpAt` (see TaskSchema) is stamped ONLY by the explicit Huis
 * pool-claim/unclaim action, never by the generic planned-auto-claim that
 * AddTaskSheet/EditTaskSheet/SuggestieRij's "Zet op mijn dag" go through — so
 * it's already the right signal on its own; the `roomId` check on top just
 * matches the ticket's literal "vanuit een Huis-kamer" scope, in case a
 * roomless task is ever claimed from Huis's household-wide "Alle taken" list.
 * "Today" is the household's local calendar day, not per-viewer (Vandaag
 * doesn't otherwise filter by who's viewing it). `now` is injectable so tests
 * don't depend on the real clock.
 */
export function splitPickedUpToday(tasks: TaskView[], now = Date.now()): { pickedUpToday: TaskView[]; rest: TaskView[] } {
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayStartMs = todayStart.getTime();
  const pickedUpToday: TaskView[] = [];
  const rest: TaskView[] = [];
  for (const t of tasks) {
    const pickedUpTodayFlag = !!t.roomId && !!t.pickedUpAt && new Date(t.pickedUpAt).getTime() >= todayStartMs;
    (pickedUpTodayFlag ? pickedUpToday : rest).push(t);
  }
  return { pickedUpToday, rest };
}

// ─── Shopping list ────────────────────────────────────────────────────────────

const SHOPPING_CATEGORIES: { key: ShoppingCategoryKey; label: string; matches: string[] }[] = [
  {
    key: "fresh",
    label: "Vers",
    matches: [
      "appel",
      "appels",
      "banaan",
      "bananen",
      "broccoli",
      "citroen",
      "fruit",
      "groente",
      "komkommer",
      "paprika",
      "sla",
      "tomaat",
      "tomaten",
      "wortel",
    ],
  },
  {
    key: "cold",
    label: "Koeling",
    matches: ["boter", "eieren", "kaas", "melk", "room", "tofu", "vla", "yoghurt", "yogurt", "zuivel"],
  },
  {
    key: "pantry",
    label: "Voorraad",
    matches: ["bonen", "brood", "crackers", "koffie", "meel", "olie", "pasta", "rijst", "suiker", "thee"],
  },
  {
    key: "household",
    label: "Huis",
    matches: ["afwas", "bakpapier", "batterij", "batterijen", "keukenpapier", "schoonmaak", "toiletpapier", "vuilniszak"],
  },
];

export const SHOPPING_CATEGORY_LABELS: Record<ShoppingCategoryKey, string> = {
  fresh: "Vers",
  cold: "Koeling",
  pantry: "Voorraad",
  household: "Huis",
  other: "Overig",
};

export const SHOPPING_CATEGORY_ORDER: ShoppingCategoryKey[] = ["fresh", "cold", "pantry", "household", "other"];

export function shoppingCategory(title: string): ShoppingCategoryKey {
  const normalized = title.toLocaleLowerCase("nl-NL");
  return SHOPPING_CATEGORIES.find((category) =>
    category.matches.some((match) => normalized.includes(match)),
  )?.key ?? "other";
}

export const SHOPPING_UNIT_ORDER: ShoppingUnitKey[] = ["stuks", "g", "kg", "ml", "l"];

export const SHOPPING_UNIT_LABELS: Record<ShoppingUnitKey, string> = {
  stuks: "stuks",
  g: "g",
  kg: "kg",
  ml: "ml",
  l: "l",
};

/** "1.5" -> "1,5", "3" -> "3" — the NL decimal-comma display form for a shopping amount, used by formatShoppingQuantity below. */
export function formatShoppingAmount(amount: number): string {
  return Number.isInteger(amount) ? String(amount) : String(amount).replace(".", ",");
}

/**
 * Compact display label for a shopping item's amount ("500ml", "1kg", "3x" for
 * a bare/"stuks" count) — falls back to the legacy free-text `quantity` for
 * rows created before amount/unit existed. A bare single "stuks" item (the
 * default for most quick-add/manual entries) shows no label at all — a redundant
 * "1" next to nearly every plain item would be visual noise, not information.
 */
export function formatShoppingQuantity(item: Pick<ShoppingItem, "amount" | "unit" | "quantity">): string | undefined {
  if (item.amount === undefined) return item.quantity;
  if (!item.unit || item.unit === "stuks") return item.amount === 1 ? undefined : `${formatShoppingAmount(item.amount)}x`;
  return `${formatShoppingAmount(item.amount)}${item.unit}`;
}

/** Split the shopping list into open vs checked, each oldest-added first. */
export function toShoppingList(items: ShoppingItem[]): ShoppingListView {
  const views: ShoppingItemView[] = [...items]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((i) => ({
      id: i.id,
      title: i.title,
      amount: i.amount,
      unit: i.unit,
      quantity: formatShoppingQuantity(i),
      description: i.description,
      checked: i.checked,
      category: i.category ?? shoppingCategory(i.title),
    }));
  const open = views.filter((i) => !i.checked);
  return {
    open,
    checked: views.filter((i) => i.checked),
    openGroups: SHOPPING_CATEGORY_ORDER.map((key) => ({
      key,
      label: SHOPPING_CATEGORY_LABELS[key],
      items: open.filter((item) => item.category === key),
    })).filter((group) => group.items.length > 0),
  };
}

// ─── Visibility feed (Samen) ─────────────────────────────────────────────────

/** Recent completions as a calm chronological feed — a message, not a score. */
export function toActivityFeed(
  completions: TaskCompletion[],
  tasks: Task[],
  rooms: Room[],
  members: Member[],
  sinceIso?: string,
): ActivityView[] {
  // Index once instead of a tasks.find()/rooms.find() per completion inside
  // the .map() below (O(completions × tasks) -> O(tasks + rooms + completions)) —
  // same Map-indexing pattern as buildLatestCompletionMap (reminders.ts).
  const taskById = new Map(tasks.map((t) => [t.id, t]));
  const roomById = new Map(rooms.map((r) => [r.id, r]));
  return completions
    .filter((c) => !sinceIso || c.completedAt >= sinceIso)
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
    .map((c) => {
      const task = taskById.get(c.taskId);
      return {
        taskId: c.taskId,
        title: task?.title ?? "Onbekende taak",
        room: task?.roomId ? roomById.get(task.roomId)?.name : undefined,
        doneBy: memberName(members, c.completedById) ?? "Iemand",
        doneById: c.completedById,
        doneAt: c.completedAt,
      };
    });
}
