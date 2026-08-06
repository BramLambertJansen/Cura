import { describe, it, expect } from "vitest";
import type { Task, TaskCompletion, Room, Bundle, Member, ShoppingItem, TaskView, Category } from "./types";
import {
  buildLatestCompletionMap,
  toTaskView,
  toRoomView,
  toRoutineView,
  toActivityFeed,
  toSuggestions,
  toTaskOverview,
  toShoppingList,
  toDagdelen,
  dagdeelForHour,
  splitDagdelen,
  splitPickedUpToday,
  formatShoppingAmount,
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
  checklistItems: [],
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

  it("daily task: hints 'Waarschijnlijk weer toe' right after its local-midnight reset, not 'Nog even goed'", () => {
    // Completed 23:55 yesterday, now 00:05 today — 10 minutes of rolling-window
    // "fraction", but a NEW calendar day, so isDone() already says not-done.
    const t = task({ intervalDays: 1 });
    const completions: TaskCompletion[] = [
      { id: "c1", taskId: t.id, completedById: "m1", completedAt: new Date(2026, 0, 1, 23, 55, 0).toISOString() },
    ];
    const now = new Date(2026, 0, 2, 0, 5, 0).getTime();
    const view = toTaskView(t, buildLatestCompletionMap(completions), [], [member()], now);
    expect(view.done).toBe(false);
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

describe("task status — derived, never stored", () => {
  it("is 'open' with no startedAt and no completion", () => {
    const now = Date.now();
    const t = task();
    const view = toTaskView(t, buildLatestCompletionMap([]), [], [member()], now);
    expect(view.status).toBe("open");
  });

  it("is 'bezig' once startedAt is set, even with no checklist", () => {
    const now = Date.now();
    const t = task({ startedAt: new Date(now).toISOString() });
    const view = toTaskView(t, buildLatestCompletionMap([]), [], [member()], now);
    expect(view.status).toBe("bezig");
  });

  it("is 'klaar' whenever done, regardless of startedAt", () => {
    const now = Date.now();
    const t = task({ startedAt: new Date(now).toISOString() });
    const completions: TaskCompletion[] = [
      { id: "c1", taskId: t.id, completedById: "m1", completedAt: new Date(now).toISOString() },
    ];
    const view = toTaskView(t, buildLatestCompletionMap(completions), [], [member()], now);
    expect(view.status).toBe("klaar");
  });

  it("is 'klaar' even without startedAt ever having been set — done doesn't require having 'started'", () => {
    const now = Date.now();
    const t = task();
    const completions: TaskCompletion[] = [
      { id: "c1", taskId: t.id, completedById: "m1", completedAt: new Date(now).toISOString() },
    ];
    const view = toTaskView(t, buildLatestCompletionMap(completions), [], [member()], now);
    expect(view.status).toBe("klaar");
  });

  it("is 'open', not 'bezig', for a recurring task once a stale startedAt from a prior cycle is left behind", () => {
    const now = Date.now();
    const t = task({
      intervalDays: 7,
      startedAt: new Date(now - 20 * DAY_MS).toISOString(), // started during the PREVIOUS cycle
    });
    const completions: TaskCompletion[] = [
      { id: "c1", taskId: t.id, completedById: "m1", completedAt: new Date(now - 15 * DAY_MS).toISOString() },
    ];
    const view = toTaskView(t, buildLatestCompletionMap(completions), [], [member()], now);
    expect(view.done).toBe(false); // 15 days > the 7-day interval, so due again
    expect(view.status).toBe("open");
  });

  it("is 'bezig' for a recurring task started after its latest completion, in the current cycle", () => {
    const now = Date.now();
    const t = task({
      intervalDays: 7,
      startedAt: new Date(now - 2 * DAY_MS).toISOString(), // started AFTER the last completion
    });
    const completions: TaskCompletion[] = [
      { id: "c1", taskId: t.id, completedById: "m1", completedAt: new Date(now - 10 * DAY_MS).toISOString() },
    ];
    const view = toTaskView(t, buildLatestCompletionMap(completions), [], [member()], now);
    expect(view.done).toBe(false);
    expect(view.status).toBe("bezig");
  });
});

describe("checklist progress — derived, independent of the task's own done-flag", () => {
  it("is undefined when the task has no checklist items", () => {
    const view = toTaskView(task(), buildLatestCompletionMap([]), [], [member()]);
    expect(view.checklistProgress).toBeUndefined();
    expect(view.checklistItems).toEqual([]);
  });

  it("counts checked vs total, independent of task.done", () => {
    const t = task({
      checklistItems: [
        { id: "c1", title: "Melk", checked: true },
        { id: "c2", title: "Brood", checked: false },
      ],
    });
    const view = toTaskView(t, buildLatestCompletionMap([]), [], [member()]);
    expect(view.checklistProgress).toEqual({ done: 1, total: 2 });
    expect(view.done).toBe(false); // checking a checklist item never auto-completes the task
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

describe("wekkerLabel — the wekker badge on TaakRij", () => {
  const now = Date.now();
  // 2024-01-15 14:30 local — a fixed, known moment so the expected label can
  // be computed with the same Intl calls the selector itself uses, instead of
  // a hardcoded string that could drift with the environment's ICU data.
  const dueDate = new Date(2024, 0, 15, 14, 30, 0);

  it("is undefined when the task has no wekker at all", () => {
    const t = task({ dueDate: undefined });
    const view = toTaskView(t, buildLatestCompletionMap([]), [], [member()], now);
    expect(view.wekkerLabel).toBeUndefined();
  });

  it("shows just the time for a recurring task's daily wekker — no date, since it repeats", () => {
    const t = task({ intervalDays: 1, dueDate: dueDate.toISOString() });
    const view = toTaskView(t, buildLatestCompletionMap([]), [], [member()], now);
    const expectedTime = dueDate.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
    expect(view.wekkerLabel).toBe(`Wekker om ${expectedTime}`);
  });

  it("shows date + time for a one-off task's deadline", () => {
    const t = task({ intervalDays: undefined, dueDate: dueDate.toISOString() });
    const view = toTaskView(t, buildLatestCompletionMap([]), [], [member()], now);
    const expectedDate = dueDate.toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" });
    const expectedTime = dueDate.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
    expect(view.wekkerLabel).toBe(`${expectedDate}, ${expectedTime}`);
  });
});

describe("formatShoppingAmount — NL decimal-comma formatting for a quantity label", () => {
  it("formats a whole number as-is", () => {
    expect(formatShoppingAmount(3)).toBe("3");
    expect(formatShoppingAmount(500)).toBe("500");
  });

  it("formats a fractional amount with a NL decimal comma", () => {
    expect(formatShoppingAmount(1.5)).toBe("1,5");
    expect(formatShoppingAmount(0.5)).toBe("0,5");
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
    // The window clamps to the ~5 days the routine has existed (earliest completion
    // 4 days ago), so 2 of 5 reads as "gaat goed" — never a punishing message.
    expect(view.windowSize).toBe(5);
    expect(view.hint).not.toMatch(/streak|verbroken|0 dagen/i);
  });

  it("gives a gentle, non-alarming hint when nothing has happened yet — never punishing language", () => {
    const now = Date.now();
    const b = bundle();
    const view = toRoutineView(b, [], [], buildLatestCompletionMap([]), [member()], now);
    expect(view.doneInWindow).toBe(0);
    // A never-touched routine has age 0 → "nieuw", not "0 van 14 — blijft liggen".
    expect(view.windowSize).toBe(0);
    expect(view.hint).toBe("Deze routine is nieuw");
    expect(view.hint).not.toMatch(/streak|verbroken|achterstallig/i);
  });

  it("judges a young, well-kept routine against its age, not the full window", () => {
    const now = Date.now();
    const b = bundle({ cadence: "weekly", windowLabel: "weken" });
    const t = task({ id: "t1", bundleId: b.id, intervalDays: undefined });
    // Done every week for the ~3 weeks it has existed — should read as "in ritme",
    // not the old, discouraging "3 van 8 weken — glipt eruit".
    const completions: TaskCompletion[] = [
      { id: "c1", taskId: "t1", completedById: "m1", completedAt: iso(0, now) },
      { id: "c2", taskId: "t1", completedById: "m1", completedAt: iso(7 * DAY_MS, now) },
      { id: "c3", taskId: "t1", completedById: "m1", completedAt: iso(14 * DAY_MS, now) },
    ];
    const view = toRoutineView(b, [t], completions, buildLatestCompletionMap(completions), [member()], now);
    expect(view.windowSize).toBe(3);
    expect(view.doneInWindow).toBe(3);
    expect(view.hint).toBe("Gaat bijna elke keer door");
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

  it("resolves each completion's task title and room name via the indexed lookup, not just the first match", () => {
    const now = Date.now();
    const keuken = room({ id: "r1", name: "Keuken" });
    const badkamer = room({ id: "r2", name: "Badkamer" });
    const t1 = task({ id: "t1", title: "Afwas", roomId: keuken.id });
    const t2 = task({ id: "t2", title: "Douche", roomId: badkamer.id });
    const t3 = task({ id: "t3", title: "Was vouwen" }); // no roomId
    const completions: TaskCompletion[] = [
      { id: "c1", taskId: "t2", completedById: "m1", completedAt: iso(0, now) },
      { id: "c2", taskId: "t1", completedById: "m1", completedAt: iso(DAY_MS, now) },
      { id: "c3", taskId: "t3", completedById: "m1", completedAt: iso(2 * DAY_MS, now) },
      { id: "c4", taskId: "unknown-task", completedById: "m1", completedAt: iso(3 * DAY_MS, now) },
    ];
    const feed = toActivityFeed(completions, [t1, t2, t3], [keuken, badkamer], [member()]);
    expect(feed).toMatchObject([
      { taskId: "t2", title: "Douche", room: "Badkamer" },
      { taskId: "t1", title: "Afwas", room: "Keuken" },
      { taskId: "t3", title: "Was vouwen", room: undefined },
      { taskId: "unknown-task", title: "Onbekende taak", room: undefined },
    ]);
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

  it("suggests a short open task even without a due hint or wekker (past goed tussendoor)", () => {
    const now = Date.now();
    const t = task({ id: "t1", durationMin: 5 });
    const view = toTaskView(t, buildLatestCompletionMap([]), [], [member()], now);
    const suggestions = toSuggestions([view]);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].id).toBe("t1");
  });

  it("does not suggest a long open task with no due hint or wekker", () => {
    const now = Date.now();
    const t = task({ id: "t1", durationMin: 30 });
    const view = toTaskView(t, buildLatestCompletionMap([]), [], [member()], now);
    expect(toSuggestions([view])).toHaveLength(0);
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

describe("shopping list", () => {
  const now = Date.now();
  const item = (overrides: Partial<ShoppingItem> = {}): ShoppingItem => ({
    id: "s1",
    householdId: "h1",
    title: "Melk",
    checked: false,
    createdAt: iso(0, now),
    ...overrides,
  });
  // A household's user-managed categories — no keyword matching, no built-in
  // set; toShoppingList just groups by whatever the household has.
  const categories: Category[] = [
    { id: "cat-vers", householdId: "h1", name: "Vers", sortOrder: 0 },
    { id: "cat-koeling", householdId: "h1", name: "Koeling", sortOrder: 1 },
    { id: "cat-huis", householdId: "h1", name: "Huis", sortOrder: 2 },
  ];

  it("splits items into open and checked", () => {
    const open1 = item({ id: "s1", checked: false });
    const checked1 = item({ id: "s2", checked: true });
    const { open, checked } = toShoppingList([open1, checked1], categories);
    expect(open.map((i) => i.id)).toEqual(["s1"]);
    expect(checked.map((i) => i.id)).toEqual(["s2"]);
  });

  it("orders each group oldest-added first", () => {
    const newer = item({ id: "s1", createdAt: iso(0, now) });
    const older = item({ id: "s2", createdAt: iso(DAY_MS, now) });
    const { open } = toShoppingList([newer, older], categories);
    expect(open.map((i) => i.id)).toEqual(["s2", "s1"]);
  });

  it("carries the legacy free-text quantity through to the view when there's no amount/unit", () => {
    const withQty = item({ id: "s1", quantity: "2" });
    const { open } = toShoppingList([withQty], categories);
    expect(open[0].quantity).toBe("2");
  });

  it("formats amount + unit into a compact quantity label", () => {
    const ml = item({ id: "s1", amount: 500, unit: "ml" });
    const kg = item({ id: "s2", amount: 1, unit: "kg" });
    const stuks = item({ id: "s3", amount: 3, unit: "stuks" });
    const { open } = toShoppingList([ml, kg, stuks], categories);
    expect(open.map((i) => i.quantity)).toEqual(["500ml", "1kg", "3x"]);
  });

  it("suppresses the label for a bare single stuks item", () => {
    const single = item({ id: "s1", amount: 1, unit: "stuks" });
    const noUnit = item({ id: "s2", amount: 1 });
    const { open } = toShoppingList([single, noUnit], categories);
    expect(open.map((i) => i.quantity)).toEqual([undefined, undefined]);
  });

  it("prefers amount/unit over a legacy quantity when both are present", () => {
    const withBoth = item({ id: "s1", quantity: "1 pak", amount: 2, unit: "kg" });
    const { open } = toShoppingList([withBoth], categories);
    expect(open[0].quantity).toBe("2kg");
  });

  it("groups open items by their category, ordered by sortOrder", () => {
    const milk = item({ id: "s1", title: "Melk", categoryId: "cat-koeling" });
    const apples = item({ id: "s2", title: "Appels", categoryId: "cat-vers" });
    const bags = item({ id: "s3", title: "Vuilniszakken", categoryId: "cat-huis" });
    const { openGroups } = toShoppingList([bags, milk, apples], categories);
    expect(openGroups.map((group) => group.name)).toEqual(["Vers", "Koeling", "Huis"]);
    expect(openGroups.map((group) => group.items.map((i) => i.id))).toEqual([["s2"], ["s1"], ["s3"]]);
  });

  it("keeps checked items out of open category groups", () => {
    const checkedMilk = item({ id: "s1", title: "Melk", checked: true, categoryId: "cat-koeling" });
    const { openGroups, checked } = toShoppingList([checkedMilk], categories);
    expect(openGroups).toHaveLength(0);
    expect(checked[0].categoryId).toBe("cat-koeling");
  });

  it("skips categories with no open items", () => {
    const milk = item({ id: "s1", title: "Melk", categoryId: "cat-koeling" });
    const { openGroups } = toShoppingList([milk], categories);
    expect(openGroups.map((group) => group.name)).toEqual(["Koeling"]);
  });

  it("puts items with no categoryId into a trailing 'Zonder categorie' bucket", () => {
    const uncategorized = item({ id: "s1", title: "Iets" });
    const { openGroups } = toShoppingList([uncategorized], categories);
    expect(openGroups).toEqual([{ id: null, name: "Zonder categorie", items: expect.arrayContaining([expect.objectContaining({ id: "s1" })]) }]);
  });

  it("falls back to 'Zonder categorie' for an item whose category was deleted", () => {
    const orphaned = item({ id: "s1", title: "Melk", categoryId: "cat-deleted" });
    const { openGroups } = toShoppingList([orphaned], categories);
    expect(openGroups.map((group) => group.name)).toEqual(["Zonder categorie"]);
    expect(openGroups[0].id).toBeNull();
  });
});

describe("Vandaag timeline — dagdeel grouping", () => {
  const taskView = (overrides: Partial<TaskView> = {}): TaskView => ({
    id: "t1",
    title: "Was ophangen",
    planned: true,
    done: false,
    status: "open",
    checklistItems: [],
    ...overrides,
  });
  const atHour = (hour: number) => new Date(2024, 0, 1, hour, 0, 0).toISOString();

  it("assigns a dagdeel only from a task's own wekker time", () => {
    const ochtend = taskView({ id: "t1", dueDate: atHour(8) });
    const middag = taskView({ id: "t2", dueDate: atHour(14) });
    const avond = taskView({ id: "t3", dueDate: atHour(20) });
    const groups = toDagdelen([ochtend, middag, avond]);
    expect(groups.map((g) => g.key)).toEqual(["ochtend", "middag", "avond"]);
    expect(groups[0].tasks.map((t) => t.id)).toEqual(["t1"]);
  });

  it("prefers a task's own explicit dagdeel tag over its wekker-derived hour", () => {
    const tagged = taskView({ id: "t1", dagdeel: "avond", dueDate: atHour(8) });
    const groups = toDagdelen([tagged]);
    expect(groups.map((g) => g.key)).toEqual(["avond"]);
  });

  it("assigns a dagdeel from an explicit tag alone, with no wekker at all", () => {
    const tagged = taskView({ id: "t1", dagdeel: "middag" });
    const groups = toDagdelen([tagged]);
    expect(groups.map((g) => g.key)).toEqual(["middag"]);
  });

  it("never invents a dagdeel for a task without a wekker — it lands in overig", () => {
    const noWekker = taskView({ id: "t1" });
    const groups = toDagdelen([noWekker]);
    expect(groups).toHaveLength(1);
    expect(groups[0].key).toBe("overig");
  });

  it("omits empty groups and keeps ochtend → middag → avond → overig order", () => {
    const avond = taskView({ id: "t1", dueDate: atHour(21) });
    const noWekker = taskView({ id: "t2" });
    const groups = toDagdelen([avond, noWekker]);
    expect(groups.map((g) => g.key)).toEqual(["avond", "overig"]);
  });

  it("splits hours at the same boundaries as the routine trigger options", () => {
    expect(dagdeelForHour(0)).toBe("ochtend");
    expect(dagdeelForHour(11)).toBe("ochtend");
    expect(dagdeelForHour(12)).toBe("middag");
    expect(dagdeelForHour(17)).toBe("middag");
    expect(dagdeelForHour(18)).toBe("avond");
    expect(dagdeelForHour(23)).toBe("avond");
  });

  it("splitDagdelen keeps the current dagdeel and everything before it in dagdelenNow, later ones in dagdelenLater", () => {
    const ochtend = { key: "ochtend" as const, label: "Ochtend", tasks: [taskView({ id: "t1" })] };
    const middag = { key: "middag" as const, label: "Middag", tasks: [taskView({ id: "t2" })] };
    const avond = { key: "avond" as const, label: "Avond", tasks: [taskView({ id: "t3" })] };
    const { dagdelenNow, dagdelenLater } = splitDagdelen([ochtend, middag, avond], "middag");
    expect(dagdelenNow.map((g) => g.key)).toEqual(["ochtend", "middag"]);
    expect(dagdelenLater.map((g) => g.key)).toEqual(["avond"]);
  });

  it("splitDagdelen never treats overig as 'later', even when nu is the last real dagdeel", () => {
    const avond = { key: "avond" as const, label: "Avond", tasks: [taskView({ id: "t1" })] };
    const overig = { key: "overig" as const, label: "Overig", tasks: [taskView({ id: "t2" })] };
    const { dagdelenNow, dagdelenLater } = splitDagdelen([avond, overig], "avond");
    expect(dagdelenNow.map((g) => g.key)).toEqual(["avond", "overig"]);
    expect(dagdelenLater).toHaveLength(0);
  });

  it("an evening wekker from a different calendar day still counts as 'later vandaag' — dagdeel grouping compares hour-of-day only, never the date", () => {
    // atHour(20) is 2024-01-01 20:00 — deliberately not "today" from nu's point
    // of view. toDagdelen has no way to know that (and isn't supposed to,
    // CLAUDE.md §Vandaag), so it still buckets this as "avond" purely from the hour.
    const avondTask = taskView({ id: "t1", dueDate: atHour(20) });
    const [avondGroup] = toDagdelen([avondTask]);
    expect(avondGroup.key).toBe("avond");
    const { dagdelenNow, dagdelenLater } = splitDagdelen([avondGroup], "ochtend");
    expect(dagdelenLater.map((g) => g.key)).toEqual(["avond"]);
    expect(dagdelenNow).toHaveLength(0);
  });
});

describe("Vandaag opgepakt — same-day Huis-pool claims, split from the timeline", () => {
  const taskView = (overrides: Partial<TaskView> = {}): TaskView => ({
    id: "t1",
    title: "Was ophangen",
    planned: true,
    done: false,
    status: "open",
    checklistItems: [],
    ...overrides,
  });
  const now = new Date(2024, 0, 2, 12, 0, 0).getTime(); // 2 jan 2024, 12:00
  const todayEarlier = new Date(2024, 0, 2, 8, 0, 0).toISOString();
  const yesterday = new Date(2024, 0, 1, 20, 0, 0).toISOString();

  it("pulls out a room task picked up from Huis today", () => {
    const picked = taskView({ id: "t1", roomId: "r1", claimedBy: "Bram", pickedUpAt: todayEarlier });
    const { pickedUpToday, rest } = splitPickedUpToday([picked], now);
    expect(pickedUpToday.map((t) => t.id)).toEqual(["t1"]);
    expect(rest).toEqual([]);
  });

  it("leaves a room task picked up from Huis on an earlier day in rest", () => {
    const oldClaim = taskView({ id: "t1", roomId: "r1", claimedBy: "Bram", pickedUpAt: yesterday });
    const { pickedUpToday, rest } = splitPickedUpToday([oldClaim], now);
    expect(pickedUpToday).toEqual([]);
    expect(rest.map((t) => t.id)).toEqual(["t1"]);
  });

  it("never treats a hand-added task (no roomId) as picked up, even with a same-day pickup timestamp", () => {
    const noRoom = taskView({ id: "t1", claimedBy: "Bram", pickedUpAt: todayEarlier });
    const { pickedUpToday, rest } = splitPickedUpToday([noRoom], now);
    expect(pickedUpToday).toEqual([]);
    expect(rest.map((t) => t.id)).toEqual(["t1"]);
  });

  it("leaves an unclaimed room task in rest", () => {
    const unclaimed = taskView({ id: "t1", roomId: "r1" });
    const { pickedUpToday, rest } = splitPickedUpToday([unclaimed], now);
    expect(pickedUpToday).toEqual([]);
    expect(rest.map((t) => t.id)).toEqual(["t1"]);
  });

  it("leaves a room task claimed today via the generic auto-claim (no pickedUpAt) in rest — e.g. planned from a Vandaag suggestion, not claimed via Huis", () => {
    const plannedFromSuggestion = taskView({ id: "t1", roomId: "r1", claimedBy: "Bram" });
    const { pickedUpToday, rest } = splitPickedUpToday([plannedFromSuggestion], now);
    expect(pickedUpToday).toEqual([]);
    expect(rest.map((t) => t.id)).toEqual(["t1"]);
  });
});
