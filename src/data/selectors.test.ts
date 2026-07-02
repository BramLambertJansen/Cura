import { describe, it, expect } from "vitest";
import type { Task, TaskCompletion, Room, Bundle, Member } from "./types";
import {
  buildLatestCompletionMap,
  toTaskView,
  toRoomView,
  toRoutineView,
  toActivityFeed,
  getDueReminders,
  toSuggestions,
  toTaskOverview,
} from "./selectors";

const DAY_MS = 86_400_000;
const iso = (msAgo: number, now: number): string => new Date(now - msAgo).toISOString();

const member = (overrides: Partial<Member> = {}): Member => ({
  id: "m1",
  householdId: "h1",
  displayName: "Bram",
  ...overrides,
});

const task = (overrides: Partial<Task> = {}): Task => ({
  id: "t1",
  householdId: "h1",
  title: "Afwas",
  planned: false,
  ...overrides,
});

const room = (overrides: Partial<Room> = {}): Room => ({
  id: "r1",
  householdId: "h1",
  name: "Keuken",
  iconKey: "kitchen",
  color: "#ccc",
  ...overrides,
});

const bundle = (overrides: Partial<Bundle> = {}): Bundle => ({
  id: "b1",
  householdId: "h1",
  name: "Ochtendroutine",
  trigger: "'s ochtends",
  cadence: "daily",
  windowLabel: "ochtenden",
  ...overrides,
});

describe("recurring task done-state", () => {
  it("is done right after completion, within the interval", () => {
    const now = Date.now();
    const t = task({ intervalDays: 7 });
    const completions: TaskCompletion[] = [
      { id: "c1", taskId: t.id, completedById: "m1", completedAt: iso(DAY_MS, now) },
    ];
    const view = toTaskView(t, buildLatestCompletionMap(completions), [], [member()], now);
    expect(view.done).toBe(true);
  });

  it("quietly becomes open again after its interval elapses — no streak, no penalty", () => {
    const now = Date.now();
    const t = task({ intervalDays: 7 });
    const completions: TaskCompletion[] = [
      { id: "c1", taskId: t.id, completedById: "m1", completedAt: iso(8 * DAY_MS, now) },
    ];
    const view = toTaskView(t, buildLatestCompletionMap(completions), [], [member()], now);
    expect(view.done).toBe(false);
    // Becoming open again is a soft due hint, not a "broken streak" message.
    expect(view.dueHint).toBe("Waarschijnlijk weer toe");
  });

  it("has never been done and is not marked done", () => {
    const now = Date.now();
    const t = task({ intervalDays: 7 });
    const view = toTaskView(t, buildLatestCompletionMap([]), [], [member()], now);
    expect(view.done).toBe(false);
  });
});

describe("one-off task done-state", () => {
  it("stays done forever after a single completion (no interval to re-open it)", () => {
    const now = Date.now();
    const t = task({ intervalDays: undefined });
    const completions: TaskCompletion[] = [
      { id: "c1", taskId: t.id, completedById: "m1", completedAt: iso(365 * DAY_MS, now) },
    ];
    const view = toTaskView(t, buildLatestCompletionMap(completions), [], [member()], now);
    expect(view.done).toBe(true);
    expect(view.doneBy).toBe("Bram");
  });

  it("is open before it has ever been completed", () => {
    const now = Date.now();
    const t = task({ intervalDays: undefined });
    const view = toTaskView(t, buildLatestCompletionMap([]), [], [member()], now);
    expect(view.done).toBe(false);
    // One-off tasks have no recurring rhythm, so no soft due hint either.
    expect(view.dueHint).toBeUndefined();
  });
});

describe("due hints — soft language, never exact counts", () => {
  const now = Date.now();
  const t = task({ intervalDays: 10 });

  it("reassures early in the interval", () => {
    const completions: TaskCompletion[] = [
      { id: "c1", taskId: t.id, completedById: "m1", completedAt: iso(1 * DAY_MS, now) },
    ];
    const view = toTaskView(t, buildLatestCompletionMap(completions), [], [member()], now);
    expect(view.dueHint).toBeUndefined(); // still done, no hint needed
  });

  it("softly nudges near the end of the interval, once no longer done", () => {
    const completions: TaskCompletion[] = [
      { id: "c1", taskId: t.id, completedById: "m1", completedAt: iso(11 * DAY_MS, now) },
    ];
    const view = toTaskView(t, buildLatestCompletionMap(completions), [], [member()], now);
    expect(view.dueHint).toBe("Waarschijnlijk weer toe");
    expect(view.dueHint).not.toMatch(/dag|geleden|\d/); // no exact day counts
  });
});

describe("routine density — rolling ratio, not a streak", () => {
  it("counts completed periods within the window, ignoring gaps outside it", () => {
    const now = Date.now();
    const b = bundle({ cadence: "daily" });
    const t = task({ id: "t1", bundleId: b.id, intervalDays: undefined });
    const completions: TaskCompletion[] = [
      { id: "c1", taskId: "t1", completedById: "m1", completedAt: iso(1 * DAY_MS, now) },
      { id: "c2", taskId: "t1", completedById: "m1", completedAt: iso(3 * DAY_MS, now) },
      // Outside the 14-day window — must not count.
      { id: "c3", taskId: "t1", completedById: "m1", completedAt: iso(30 * DAY_MS, now) },
    ];
    const view = toRoutineView(b, [t], completions, buildLatestCompletionMap(completions), [member()], now);
    expect(view.windowSize).toBe(14);
    expect(view.doneInWindow).toBe(2);
  });

  it("a missed period lowers the ratio but never resets it or calls it a broken streak", () => {
    const now = Date.now();
    const b = bundle({ cadence: "daily" });
    const t = task({ id: "t1", bundleId: b.id, intervalDays: undefined });
    // Two done days, then a gap, then nothing recent — density should reflect the
    // ratio, and the hint must be encouraging language, never punishing.
    const completions: TaskCompletion[] = [
      { id: "c1", taskId: "t1", completedById: "m1", completedAt: iso(2 * DAY_MS, now) },
      { id: "c2", taskId: "t1", completedById: "m1", completedAt: iso(4 * DAY_MS, now) },
    ];
    const view = toRoutineView(b, [t], completions, buildLatestCompletionMap(completions), [member()], now);
    expect(view.doneInWindow).toBe(2);
    expect(view.windowSize).toBe(14);
    expect(view.hint).not.toMatch(/streak|verbroken|0 dagen/i);
  });

  it("gives a gentle, non-alarming hint when nothing has happened yet — never punishing language", () => {
    const now = Date.now();
    const b = bundle();
    const view = toRoutineView(b, [], [], buildLatestCompletionMap([]), [member()], now);
    expect(view.doneInWindow).toBe(0);
    expect(view.hint).not.toMatch(/streak|verbroken|achterstallig/i);
  });
});

describe("activity feed sorting", () => {
  it("orders completions newest-first, as a message feed rather than a log", () => {
    const now = Date.now();
    const t1 = task({ id: "t1", title: "Afwas" });
    const t2 = task({ id: "t2", title: "Stofzuigen" });
    const completions: TaskCompletion[] = [
      { id: "c1", taskId: "t1", completedById: "m1", completedAt: iso(2 * DAY_MS, now) },
      { id: "c2", taskId: "t2", completedById: "m1", completedAt: iso(0, now) },
      { id: "c3", taskId: "t1", completedById: "m1", completedAt: iso(1 * DAY_MS, now) },
    ];
    const feed = toActivityFeed(completions, [t1, t2], [], [member()]);
    expect(feed.map((a) => a.taskId)).toEqual(["t2", "t1", "t1"]);
  });

  it("bounds the feed with `since` without breaking sort order", () => {
    const now = Date.now();
    const t1 = task({ id: "t1" });
    const sinceIso = iso(1.5 * DAY_MS, now);
    const completions: TaskCompletion[] = [
      { id: "c1", taskId: "t1", completedById: "m1", completedAt: iso(2 * DAY_MS, now) }, // excluded
      { id: "c2", taskId: "t1", completedById: "m1", completedAt: iso(1 * DAY_MS, now) },
      { id: "c3", taskId: "t1", completedById: "m1", completedAt: iso(0, now) },
    ];
    const feed = toActivityFeed(completions, [t1], [], [member()], sinceIso);
    expect(feed).toHaveLength(2);
    expect(feed[0].doneAt >= feed[1].doneAt).toBe(true);
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

  it("fires a recurring reminder once per day, keyed by date, not by exact time", () => {
    const now = new Date();
    now.setHours(9, 30, 0, 0);
    const dueDate = new Date(now);
    dueDate.setHours(9, 0, 0, 0); // wekker set for 09:00, we're past it today
    const t = task({ intervalDays: 1, dueDate: dueDate.toISOString() });
    const reminders = getDueReminders([t], buildLatestCompletionMap([]), now.getTime());
    expect(reminders).toHaveLength(1);
    expect(reminders[0].firedForKey).toBe(`${t.id}:${now.toISOString().slice(0, 10)}`);
  });

  it("does not fire a recurring reminder before today's time-of-day arrives", () => {
    const now = new Date();
    now.setHours(8, 0, 0, 0);
    const dueDate = new Date(now);
    dueDate.setHours(9, 0, 0, 0);
    const t = task({ intervalDays: 1, dueDate: dueDate.toISOString() });
    const reminders = getDueReminders([t], buildLatestCompletionMap([]), now.getTime());
    expect(reminders).toHaveLength(0);
  });
});

describe("Vandaag suggestions — manual, no AI", () => {
  const now = Date.now();

  it("excludes tasks already planned or already done", () => {
    const tasks = [
      task({ id: "t1", intervalDays: 5, dueDate: iso(0, now) }),
    ];
    const completions: TaskCompletion[] = [];
    const view = toTaskView({ ...tasks[0], planned: true }, buildLatestCompletionMap(completions), [], [member()], now);
    expect(toSuggestions([view])).toHaveLength(0);
  });

  it("suggests an open, unplanned task that is softly overdue", () => {
    const t = task({ id: "t1", intervalDays: 5 });
    const completions: TaskCompletion[] = [
      { id: "c1", taskId: "t1", completedById: "m1", completedAt: iso(6 * DAY_MS, now) },
    ];
    const view = toTaskView(t, buildLatestCompletionMap(completions), [], [member()], now);
    const suggestions = toSuggestions([view]);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].id).toBe("t1");
  });

  it("suggests an open task carrying a wekker, even without a due hint", () => {
    const t = task({ id: "t1", dueDate: iso(0, now) });
    const view = toTaskView(t, buildLatestCompletionMap([]), [], [member()], now);
    expect(toSuggestions([view])).toHaveLength(1);
  });

  it("sorts shortest duration first, unknown duration last", () => {
    const longTask = task({ id: "t1", durationMin: 30, dueDate: iso(0, now) });
    const shortTask = task({ id: "t2", durationMin: 5, dueDate: iso(0, now) });
    const unknownTask = task({ id: "t3", dueDate: iso(0, now) });
    const views = [longTask, shortTask, unknownTask].map((t) =>
      toTaskView(t, buildLatestCompletionMap([]), [], [member()], now),
    );
    const suggestions = toSuggestions(views);
    expect(suggestions.map((s) => s.id)).toEqual(["t2", "t1", "t3"]);
  });

  it("never phrases a suggestion as an exact day count", () => {
    const t = task({ id: "t1", intervalDays: 3 });
    const completions: TaskCompletion[] = [
      { id: "c1", taskId: "t1", completedById: "m1", completedAt: iso(10 * DAY_MS, now) },
    ];
    const view = toTaskView(t, buildLatestCompletionMap(completions), [], [member()], now);
    const [suggestion] = toSuggestions([view]);
    expect(suggestion.dueHint).not.toMatch(/\d/);
  });
});

describe("task overview buckets", () => {
  const now = Date.now();
  const view = (t: Task, completions: TaskCompletion[] = []) =>
    toTaskView(t, buildLatestCompletionMap(completions), [], [member()], now);

  it("puts a one-off with a passed deadline in overdue", () => {
    const v = view(task({ id: "t1", dueDate: iso(DAY_MS, now) }));
    const { overdue, upcoming, recurring, undated } = toTaskOverview([v], now);
    expect(overdue.map((t) => t.id)).toEqual(["t1"]);
    expect([upcoming, recurring, undated].every((g) => g.length === 0)).toBe(true);
  });

  it("puts a one-off due now or later in upcoming", () => {
    const future = view(task({ id: "t1", dueDate: iso(-DAY_MS, now) })); // now + 1 day
    const exactlyNow = view(task({ id: "t2", dueDate: iso(0, now) }));
    const { upcoming, overdue } = toTaskOverview([future, exactlyNow], now);
    expect(upcoming.map((t) => t.id).sort()).toEqual(["t1", "t2"]);
    expect(overdue).toHaveLength(0);
  });

  it("groups every open recurring task under recurring (open ⟹ due again)", () => {
    // Whatever a recurring task's completion history or wekker, if it's open it
    // is due again — so it always lands in the one recurring bucket.
    const neverDone = view(task({ id: "t1", intervalDays: 5 }));
    const withWekker = view(task({ id: "t2", intervalDays: 7, dueDate: iso(DAY_MS, now) }));
    const overdueInterval = view(
      task({ id: "t3", intervalDays: 3 }),
      [{ id: "c1", taskId: "t3", completedById: "m1", completedAt: iso(10 * DAY_MS, now) }],
    );
    const { recurring, overdue, upcoming, undated } = toTaskOverview(
      [neverDone, withWekker, overdueInterval], now,
    );
    expect(recurring.map((t) => t.id).sort()).toEqual(["t1", "t2", "t3"]);
    expect([overdue, upcoming, undated].every((g) => g.length === 0)).toBe(true);
  });

  it("excludes a recurring task completed within its interval (done, not open)", () => {
    const t = task({ id: "t1", intervalDays: 7 });
    const done = view(t, [{ id: "c1", taskId: "t1", completedById: "m1", completedAt: iso(DAY_MS, now) }]);
    const buckets = toTaskOverview([done], now);
    expect(Object.values(buckets).every((g) => g.length === 0)).toBe(true);
  });

  it("puts a one-off without a wekker in undated", () => {
    const v = view(task({ id: "t1" }));
    const { undated } = toTaskOverview([v], now);
    expect(undated.map((t) => t.id)).toEqual(["t1"]);
  });

  it("excludes done tasks from every bucket", () => {
    const t = task({ id: "t1", dueDate: iso(DAY_MS, now) });
    const done = view(t, [{ id: "c1", taskId: "t1", completedById: "m1", completedAt: iso(0, now) }]);
    const buckets = toTaskOverview([done], now);
    expect(Object.values(buckets).every((g) => g.length === 0)).toBe(true);
  });
});

describe("room view hint", () => {
  it("derives a soft hint without exposing counts or timestamps", () => {
    const now = Date.now();
    const r = room();
    const t = task({ id: "t1", roomId: r.id, intervalDays: 5 });
    const completions: TaskCompletion[] = [
      { id: "c1", taskId: "t1", completedById: "m1", completedAt: iso(6 * DAY_MS, now) },
    ];
    const view = toRoomView(r, [t], buildLatestCompletionMap(completions), [member()], now);
    expect(view.hint).toBe("Waarschijnlijk weer toe aan een beurt");
    expect(view.openCount).toBe(1);
  });
});
