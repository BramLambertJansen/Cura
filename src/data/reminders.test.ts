import { describe, it, expect } from "vitest";
import type { Task, TaskCompletion } from "./types";
import { buildLatestCompletionMap, isDone, getDueReminders, isWithinQuietHours } from "./reminders";
import appEngineSrc from "./reminders.ts?raw";
import sharedEngineSrc from "../../supabase/functions/_shared/reminders.ts?raw";

const DAY_MS = 86_400_000;
const iso = (msAgo: number, now: number): string => new Date(now - msAgo).toISOString();

const task = (overrides: Partial<Task> = {}): Task => ({
  id: "t1",
  householdId: "h1",
  title: "Afwas",
  planned: false,
  ...overrides,
});

describe("isDone", () => {
  it("marks a one-off as done forever after any completion", () => {
    const now = Date.now();
    const t = task({ intervalDays: undefined });
    const latest: TaskCompletion = { id: "c1", taskId: t.id, completedById: "m1", completedAt: iso(365 * DAY_MS, now) };
    expect(isDone(t, latest, now)).toBe(true);
  });

  it("re-opens a recurring task once its interval has elapsed", () => {
    const now = Date.now();
    const t = task({ intervalDays: 7 });
    const withinCycle: TaskCompletion = { id: "c1", taskId: t.id, completedById: "m1", completedAt: iso(DAY_MS, now) };
    const pastCycle: TaskCompletion = { id: "c2", taskId: t.id, completedById: "m1", completedAt: iso(8 * DAY_MS, now) };
    expect(isDone(t, withinCycle, now)).toBe(true);
    expect(isDone(t, pastCycle, now)).toBe(false);
    expect(isDone(t, undefined, now)).toBe(false);
  });
});

describe("reminder trigger logic", () => {
  it("fires a one-off reminder once its deadline has passed", () => {
    const now = Date.now();
    const t = task({ dueDate: iso(60_000, now) }); // due 1 min ago
    const reminders = getDueReminders([t], buildLatestCompletionMap([]), now);
    expect(reminders).toHaveLength(1);
    expect(reminders[0].firedForKey).toBe(t.id);
  });

  it("does not spam for an old one-off deadline outside the lookback window", () => {
    const now = Date.now();
    const t = task({ dueDate: iso(2 * DAY_MS, now) }); // due 2 days ago
    const reminders = getDueReminders([t], buildLatestCompletionMap([]), now);
    expect(reminders).toHaveLength(0);
  });

  it("does not remind for a one-off task that has already been completed", () => {
    const now = Date.now();
    const t = task({ id: "t1", dueDate: iso(60_000, now) });
    const completions: TaskCompletion[] = [
      { id: "c1", taskId: "t1", completedById: "m1", completedAt: iso(30_000, now) },
    ];
    const reminders = getDueReminders([t], buildLatestCompletionMap(completions), now);
    expect(reminders).toHaveLength(0);
  });

  it("fires a recurring reminder once per day, keyed by date, not by exact time (runtime tz)", () => {
    const now = new Date();
    now.setHours(9, 30, 0, 0);
    const dueDate = new Date(now);
    dueDate.setHours(9, 0, 0, 0); // wekker set for 09:00, we're past it today
    const t = task({ intervalDays: 1, dueDate: dueDate.toISOString() });
    const reminders = getDueReminders([t], buildLatestCompletionMap([]), now.getTime());
    expect(reminders).toHaveLength(1);
    expect(reminders[0].firedForKey).toBe(`${t.id}:${now.toISOString().slice(0, 10)}`);
  });

  it("does not fire a recurring reminder before today's time-of-day arrives (runtime tz)", () => {
    const now = new Date();
    now.setHours(8, 0, 0, 0);
    const dueDate = new Date(now);
    dueDate.setHours(9, 0, 0, 0);
    const t = task({ intervalDays: 1, dueDate: dueDate.toISOString() });
    const reminders = getDueReminders([t], buildLatestCompletionMap([]), now.getTime());
    expect(reminders).toHaveLength(0);
  });
});

// These assert exact instants against a fixed IANA zone, so they hold regardless
// of the machine/CI timezone — which is exactly the server-side (UTC) scenario.
describe("reminder trigger logic — explicit timezone (server-side parity)", () => {
  const AMS = "Europe/Amsterdam"; // UTC+2 on this summer date

  it("fires a recurring wekker once the household-local time-of-day is reached", () => {
    // 09:00 Amsterdam on 2026-07-06 == 07:00Z. Only HH:mm is read for recurring.
    const t = task({ intervalDays: 1, dueDate: "2026-07-06T07:00:00.000Z" });
    const now = Date.UTC(2026, 6, 6, 8, 0); // 10:00 Amsterdam — past 09:00
    const reminders = getDueReminders([t], buildLatestCompletionMap([]), now, AMS);
    expect(reminders).toHaveLength(1);
    expect(reminders[0].firedForKey).toBe("t1:2026-07-06");
  });

  it("does not fire the recurring wekker before the household-local time arrives", () => {
    const t = task({ intervalDays: 1, dueDate: "2026-07-06T07:00:00.000Z" }); // 09:00 Amsterdam
    const now = Date.UTC(2026, 6, 6, 6, 0); // 08:00 Amsterdam — before 09:00
    const reminders = getDueReminders([t], buildLatestCompletionMap([]), now, AMS);
    expect(reminders).toHaveLength(0);
  });

  it("keys the dedup on the household-local date, not the UTC date", () => {
    // 09:00 New York (UTC-4 summer) == 13:00Z on 2026-07-06.
    const NY = "America/New_York";
    const t = task({ intervalDays: 1, dueDate: "2026-07-06T13:00:00.000Z" });
    // 2026-07-07 01:00Z is 2026-07-06 21:00 in New York — same local day as the
    // wekker, a DIFFERENT UTC day. The key must follow the local (NY) date.
    const now = Date.UTC(2026, 6, 7, 1, 0);
    const reminders = getDueReminders([t], buildLatestCompletionMap([]), now, NY);
    expect(reminders).toHaveLength(1);
    expect(reminders[0].firedForKey).toBe("t1:2026-07-06");
  });

  it("one-off deadlines are timezone-independent (a pure instant comparison)", () => {
    const now = Date.UTC(2026, 6, 6, 12, 0);
    const t = task({ dueDate: new Date(now - 60_000).toISOString() });
    expect(getDueReminders([t], buildLatestCompletionMap([]), now, AMS)).toHaveLength(1);
    expect(getDueReminders([t], buildLatestCompletionMap([]), now, "America/New_York")).toHaveLength(1);
  });
});

describe("isWithinQuietHours", () => {
  const AMS = "Europe/Amsterdam"; // UTC+2 on this summer date

  it("is off when start/end are unset", () => {
    const now = Date.UTC(2026, 6, 6, 23, 0); // 01:00 Amsterdam
    expect(isWithinQuietHours(now, AMS)).toBe(false);
    expect(isWithinQuietHours(now, AMS, "22:00")).toBe(false);
    expect(isWithinQuietHours(now, AMS, undefined, "07:00")).toBe(false);
  });

  it("matches a same-day range (e.g. 12:00-13:00)", () => {
    const inRange = Date.UTC(2026, 6, 6, 10, 30); // 12:30 Amsterdam
    const outOfRange = Date.UTC(2026, 6, 6, 12, 0); // 14:00 Amsterdam
    expect(isWithinQuietHours(inRange, AMS, "12:00", "13:00")).toBe(true);
    expect(isWithinQuietHours(outOfRange, AMS, "12:00", "13:00")).toBe(false);
  });

  it("wraps midnight (e.g. 22:00-07:00)", () => {
    const lateNight = Date.UTC(2026, 6, 6, 21, 0); // 23:00 Amsterdam
    const earlyMorning = Date.UTC(2026, 6, 6, 3, 30); // 05:30 Amsterdam (next day, still quiet)
    const daytime = Date.UTC(2026, 6, 6, 10, 0); // 12:00 Amsterdam
    expect(isWithinQuietHours(lateNight, AMS, "22:00", "07:00")).toBe(true);
    expect(isWithinQuietHours(earlyMorning, AMS, "22:00", "07:00")).toBe(true);
    expect(isWithinQuietHours(daytime, AMS, "22:00", "07:00")).toBe(false);
  });

  it("treats an equal start/end as off, not a full-day window", () => {
    const now = Date.UTC(2026, 6, 6, 10, 0);
    expect(isWithinQuietHours(now, AMS, "09:00", "09:00")).toBe(false);
  });

  it("start is inclusive, end is exclusive", () => {
    const atStart = Date.UTC(2026, 6, 6, 20, 0); // 22:00 Amsterdam exactly
    const atEnd = Date.UTC(2026, 6, 7, 5, 0); // 07:00 Amsterdam exactly
    expect(isWithinQuietHours(atStart, AMS, "22:00", "07:00")).toBe(true);
    expect(isWithinQuietHours(atEnd, AMS, "22:00", "07:00")).toBe(false);
  });
});

// The server-side push scheduler runs a COPY of this engine
// (supabase/functions/_shared/reminders.ts) because Deno can't import across the
// src/ boundary. This guard fails the moment the two drift, so a fix here can't
// silently leave the server firing at the wrong time / with a mismatched key.
describe("reminder engine — client/server copy parity", () => {
  it("supabase/functions/_shared/reminders.ts is identical to src/data/reminders.ts", () => {
    const normalize = (s: string) => s.replace(/\r\n/g, "\n");
    expect(normalize(sharedEngineSrc)).toBe(normalize(appEngineSrc));
  });
});
