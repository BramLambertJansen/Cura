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
} from "./types";

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
 */

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DAY_MS = 86_400_000;

const memberName = (members: Member[], id?: string): string | undefined =>
  id ? members.find((m) => m.id === id)?.displayName : undefined;

const formatDuration = (min?: number): string | undefined =>
  min ? `${min} min` : undefined;

const formatTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });

/**
 * taskId -> most recent completion, built in a single O(n) pass. Callers used to
 * filter+sort the full completions array per task (O(tasks * completions)); this
 * lets a hook build the map once and every toTaskView/toRoomView/toRoutineView
 * call below just look it up.
 */
export function buildLatestCompletionMap(
  completions: TaskCompletion[],
): Map<string, TaskCompletion> {
  const map = new Map<string, TaskCompletion>();
  for (const c of completions) {
    const existing = map.get(c.taskId);
    if (!existing || c.completedAt > existing.completedAt) map.set(c.taskId, c);
  }
  return map;
}

// ─── Task "done" + soft due hint ─────────────────────────────────────────────

/**
 * Is a task "done" right now?
 *  - One-off task (no intervalDays): done if it has ANY completion.
 *  - Recurring task: done if its latest completion falls within the current cycle
 *    (i.e. less than intervalDays ago). After that it quietly becomes due again.
 */
function isDone(task: Task, latest?: TaskCompletion, now = Date.now()): boolean {
  if (!latest) return false;
  if (!task.intervalDays) return true; // one-off, ever-completed = done
  const age = now - new Date(latest.completedAt).getTime();
  return age < task.intervalDays * DAY_MS;
}

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
    roomId: task.roomId,
    room: rooms.find((r) => r.id === task.roomId)?.name,
    duration: formatDuration(task.durationMin),
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

// ─── Reminder engine — pure, no DOM/React, reusable server-side ──────────────

export interface DueReminder {
  taskId: string;
  title: string;
  /** Dedup key: task.id for one-off; `${task.id}:yyyy-mm-dd` for recurring (new day = new reminder). */
  firedForKey: string;
}

/**
 * Which tasks' wekker should fire right now?
 *
 * Pure (domain data, now) -> results — no DOM, no React, no Notification API.
 * This is the seam between in-app dispatch (useTaskReminders) and a future
 * server-side push scheduler (Supabase edge function + pg_cron): the "which
 * tasks are due" logic lives here and is shared by both, unchanged.
 *
 * - One-off: fires once when now >= dueDate (within a 24h lookback window to
 *   avoid re-pinging for forgotten deadlines from previous days).
 * - Recurring: fires daily at the time-of-day encoded in dueDate (date portion
 *   is ignored); one fire per calendar day per task.
 * - Already-done tasks (per isDone) are skipped — no reminder for finished work.
 */
export function getDueReminders(
  tasks: Task[],
  latestByTask: Map<string, TaskCompletion>,
  now = Date.now(),
): DueReminder[] {
  const result: DueReminder[] = [];
  for (const task of tasks) {
    if (!task.dueDate) continue;
    const latest = latestByTask.get(task.id);
    if (isDone(task, latest, now)) continue;

    const due = new Date(task.dueDate);

    if (!task.intervalDays) {
      const dueMs = due.getTime();
      // Fire once, within 24h of the set moment (don't resurrect week-old missed reminders)
      if (now >= dueMs && now - dueMs < DAY_MS) {
        result.push({ taskId: task.id, title: task.title, firedForKey: task.id });
      }
    } else {
      // Recurring: only HH:mm from dueDate matters; compute "today at that time"
      const today = new Date(now);
      const todaysInstance = new Date(
        today.getFullYear(), today.getMonth(), today.getDate(),
        due.getHours(), due.getMinutes(), 0, 0,
      );
      const todayStr = todaysInstance.toISOString().slice(0, 10);
      if (now >= todaysInstance.getTime()) {
        result.push({ taskId: task.id, title: task.title, firedForKey: `${task.id}:${todayStr}` });
      }
    }
  }
  return result;
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

  // Count bundle-task completions per period within the window.
  const perPeriod = new Map<string, number>();
  for (const c of completions) {
    if (!bundleTaskIds.has(c.taskId)) continue;
    if (new Date(c.completedAt).getTime() < cutoff) continue;
    const key = periodKey(c.completedAt, bundle.cadence);
    perPeriod.set(key, (perPeriod.get(key) ?? 0) + 1);
  }
  const doneInWindow = [...perPeriod.values()].filter((n) => n >= PARTIAL_THRESHOLD).length;

  return {
    id: bundle.id,
    name: bundle.name,
    trigger: bundle.trigger,
    tasks: tasks
      .filter((t) => t.bundleId === bundle.id)
      .map((t) => toTaskView(t, latestByTask, [], members, now)),
    doneInWindow,
    windowSize,
    windowLabel: bundle.windowLabel,
    hint: densityHint(doneInWindow, windowSize),
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
        doneAt: c.completedAt,
      };
    });
}
