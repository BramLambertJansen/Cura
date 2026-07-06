import type {
  Task,
  TaskCompletion,
  Room,
  Bundle,
  Member,
  TaskView,
  RoomView,
  RoutineView,
  ActivityView,
  TaskOverview,
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
): TaskView {
  const latest = latestByTask.get(task.id);
  const done = isDone(task, latest, now);
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
    doneAt: done && latest ? formatTime(latest.completedAt) : undefined,
    claimedBy: memberName(members, task.claimedById),
    dueHint: done ? undefined : dueHint(task, latest, now),
    dueDate: task.dueDate,
    wekkerLabel: wekkerLabel(task),
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
): RoomView {
  const roomTasks = tasks
    .filter((t) => t.roomId === room.id)
    .map((t) => toTaskView(t, latestByTask, [room], members, now));
  const openCount = roomTasks.filter((t) => !t.done).length;
  const anyDue = roomTasks.some((t) => t.dueHint === "Waarschijnlijk weer toe");
  return {
    id: room.id,
    name: room.name,
    iconKey: room.iconKey,
    color: room.color,
    owner: memberName(members, room.ownerId),
    ownerId: room.ownerId,
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
export function toRoutineView(
  bundle: Bundle,
  tasks: Task[],
  completions: TaskCompletion[],
  latestByTask: Map<string, TaskCompletion>,
  members: Member[],
  now = Date.now(),
): RoutineView {
  const bundleTaskIds = new Set(tasks.filter((t) => t.bundleId === bundle.id).map((t) => t.id));
  const windowSize = bundle.cadence === "daily" ? DAILY_WINDOW : WEEKLY_WINDOW;
  const periodMs = (bundle.cadence === "daily" ? 1 : 7) * DAY_MS;
  const cutoff = now - windowSize * periodMs;

  // Count bundle-task completions per period within the window, and track the
  // routine's earliest activity so a young routine isn't judged against a full
  // window it never had the chance to fill.
  const perPeriod = new Map<string, number>();
  let earliestMs = Infinity;
  for (const c of completions) {
    if (!bundleTaskIds.has(c.taskId)) continue;
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
      .map((t) => toTaskView(t, latestByTask, [], members, now)),
    doneInWindow,
    windowSize: effectiveWindow,
    windowLabel: bundle.windowLabel,
    hint: densityHint(doneInWindow, effectiveWindow),
  };
}

/** Qualitative line over the ratio. Encouraging, never punishing. */
function densityHint(done: number, total: number): string {
  if (total === 0) return "Pas begonnen";
  const ratio = done / total;
  if (ratio >= 0.75) return "Zit lekker in je ritme";
  if (ratio >= 0.4) return "Gaat goed";
  return "Glipt er de laatste tijd een beetje uit";
}

// ─── Vandaag suggestions — manual, no AI ─────────────────────────────────────

/**
 * Candidate tasks that could be handy to plan today: not already on today's
 * plan, still open, and either softly due (`dueHint` says so) or carrying a
 * wekker/dueDate. Sorted shortest-duration-first (a gentle, optional nudge —
 * never a priority ranking) with unknown-duration tasks trailing. No AI, no
 * external calls — pure derivation from data already in the domain.
 */
export function toSuggestions(tasks: TaskView[], limit = 5): TaskView[] {
  const candidates = tasks.filter(
    (t) => !t.planned && !t.done && (t.dueHint === "Waarschijnlijk weer toe" || t.dueDate !== undefined),
  );
  return [...candidates]
    .sort((a, b) => suggestionDurationMin(a) - suggestionDurationMin(b))
    .slice(0, limit);
}

function suggestionDurationMin(task: TaskView): number {
  const match = task.duration?.match(/(\d+)/);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
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

// ─── Visibility feed (Samen) ─────────────────────────────────────────────────

/** Recent completions as a calm chronological feed — a message, not a score. */
export function toActivityFeed(
  completions: TaskCompletion[],
  tasks: Task[],
  rooms: Room[],
  members: Member[],
  sinceIso?: string,
): ActivityView[] {
  return completions
    .filter((c) => !sinceIso || c.completedAt >= sinceIso)
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
    .map((c) => {
      const task = tasks.find((t) => t.id === c.taskId);
      return {
        taskId: c.taskId,
        title: task?.title ?? "Onbekende taak",
        room: rooms.find((r) => r.id === task?.roomId)?.name,
        doneBy: memberName(members, c.completedById) ?? "Iemand",
        doneById: c.completedById,
        doneAt: c.completedAt,
      };
    });
}
