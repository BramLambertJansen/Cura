import type { Task, TaskCompletion } from "./types";

/**
 * REMINDER ENGINE — pure, no DOM/React, no Supabase.
 *
 * This is the seam between in-app dispatch (useTaskReminders) and the
 * server-side push scheduler (Supabase edge function + pg_cron): "which tasks
 * are due right now" lives here and is shared by both, unchanged. It imports
 * only `import type` from ./types, so it runs identically in the browser (Vite)
 * and in a Deno edge function — see supabase/functions/_shared/reminders.ts,
 * which is a byte-identical copy guarded by a unit test.
 *
 * Timezone: recurring wekkers encode only an HH:mm (a daily reminder time). The
 * in-app poller runs in the user's timezone, but the edge function runs in UTC,
 * so both the "today at HH:mm" comparison AND the yyyy-mm-dd dedup key MUST be
 * computed in an explicit IANA timezone (the household's), not the runtime's —
 * otherwise recurring reminders fire at the wrong wall-clock time server-side
 * and the dedup key rolls over at UTC midnight instead of local midnight
 * (which also silently breaks the client/server firedForKey parity that the
 * double-notification dedup relies on).
 */

const DAY_MS = 86_400_000;

/**
 * taskId -> most recent completion, built in a single O(n) pass. Callers used to
 * filter+sort the full completions array per task (O(tasks * completions)); this
 * lets a hook build the map once and every toTaskView/toRoomView/toRoutineView
 * call just look it up.
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

/**
 * Is a task "done" right now?
 *  - One-off task (no intervalDays): done if it has ANY completion.
 *  - Recurring task: done if its latest completion falls within the current cycle
 *    (i.e. less than intervalDays ago). After that it quietly becomes due again.
 */
export function isDone(task: Task, latest?: TaskCompletion, now = Date.now()): boolean {
  if (!latest) return false;
  if (!task.intervalDays) return true; // one-off, ever-completed = done
  const age = now - new Date(latest.completedAt).getTime();
  return age < task.intervalDays * DAY_MS;
}

// ─── Timezone helpers — correct wall-clock in an explicit IANA zone ──────────

interface WallClock {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number; // 0-23
  minute: number;
}

/** The wall-clock components of an instant (`utcMs`) as seen in `timeZone`. */
function partsInTz(utcMs: number, timeZone: string): WallClock {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(utcMs));
  const m: Record<string, number> = {};
  for (const p of parts) if (p.type !== "literal") m[p.type] = Number(p.value);
  return {
    year: m.year,
    month: m.month,
    day: m.day,
    hour: m.hour === 24 ? 0 : m.hour, // some engines emit 24 for midnight
    minute: m.minute,
  };
}

/**
 * Epoch ms for a wall-clock time in `timeZone`. Uses the standard offset-refine
 * trick so it stays correct across DST: guess as-if-UTC, correct by the zone's
 * offset at that instant, then re-check the offset at the corrected instant.
 */
function zonedWallClockToMs(wc: WallClock, timeZone: string): number {
  const guess = Date.UTC(wc.year, wc.month - 1, wc.day, wc.hour, wc.minute, 0);
  const offset1 = tzOffsetMs(guess, timeZone);
  const corrected = guess - offset1;
  const offset2 = tzOffsetMs(corrected, timeZone);
  return guess - offset2;
}

/** Milliseconds `timeZone` is offset from UTC at instant `utcMs` (e.g. +7_200_000 for Amsterdam in summer). */
function tzOffsetMs(utcMs: number, timeZone: string): number {
  const wc = partsInTz(utcMs, timeZone);
  const asUTC = Date.UTC(wc.year, wc.month - 1, wc.day, wc.hour, wc.minute, 0);
  // partsInTz drops seconds; align the compared instant to the same minute so
  // the diff is a clean timezone offset rather than being polluted by seconds.
  return asUTC - Math.floor(utcMs / 60_000) * 60_000;
}

const pad = (n: number, width = 2): string => String(n).padStart(width, "0");

/** Runtime timezone fallback when no household timezone is supplied (client-only). */
function runtimeTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

// ─── Reminder engine ─────────────────────────────────────────────────────────

export interface DueReminder {
  taskId: string;
  title: string;
  /** Dedup key: task.id for one-off; `${task.id}:yyyy-mm-dd` for recurring (new day = new reminder). */
  firedForKey: string;
}

/**
 * Which tasks' wekker should fire right now?
 *
 * Pure (domain data, now, timeZone) -> results — no DOM, no React, no
 * Notification API. Shared by the in-app poller and the server scheduler.
 *
 * - One-off: fires once when now >= dueDate (within a 24h lookback window to
 *   avoid re-pinging for forgotten deadlines from previous days). Timezone-
 *   independent — a pure instant comparison.
 * - Recurring: fires daily at the time-of-day encoded in dueDate, interpreted
 *   in `timeZone`; one fire per calendar day (keyed by the local date in
 *   `timeZone`) per task.
 * - Already-done tasks (per isDone) are skipped — no reminder for finished work.
 *
 * `timeZone` defaults to the runtime timezone so client call-sites that don't
 * pass one keep working; the server MUST pass the household's stored timezone.
 */
export function getDueReminders(
  tasks: Task[],
  latestByTask: Map<string, TaskCompletion>,
  now = Date.now(),
  timeZone: string = runtimeTimeZone(),
): DueReminder[] {
  const result: DueReminder[] = [];
  for (const task of tasks) {
    if (!task.dueDate) continue;
    const latest = latestByTask.get(task.id);
    if (isDone(task, latest, now)) continue;

    const dueMs = new Date(task.dueDate).getTime();

    if (!task.intervalDays) {
      // Fire once, within 24h of the set moment (don't resurrect week-old missed reminders)
      if (now >= dueMs && now - dueMs < DAY_MS) {
        result.push({ taskId: task.id, title: task.title, firedForKey: task.id });
      }
    } else {
      // Recurring: only HH:mm from dueDate matters, read in `timeZone`.
      const dueWc = partsInTz(dueMs, timeZone);
      const nowWc = partsInTz(now, timeZone);
      const todaysInstance: WallClock = {
        year: nowWc.year,
        month: nowWc.month,
        day: nowWc.day,
        hour: dueWc.hour,
        minute: dueWc.minute,
      };
      const todaysInstanceMs = zonedWallClockToMs(todaysInstance, timeZone);
      const todayStr = `${pad(nowWc.year, 4)}-${pad(nowWc.month)}-${pad(nowWc.day)}`;
      if (now >= todaysInstanceMs) {
        result.push({ taskId: task.id, title: task.title, firedForKey: `${task.id}:${todayStr}` });
      }
    }
  }
  return result;
}
