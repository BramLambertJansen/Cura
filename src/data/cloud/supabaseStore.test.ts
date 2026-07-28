import { describe, it, expect, vi, afterEach } from "vitest";

// SupabaseStore.createTask/updateTask/createShoppingItem's retry-on-missing-column
// loops (CLAUDE.md §4 Phase 3 notes) were previously only covered indirectly via
// the pure isMissingTaskColumn/missingShoppingColumns helpers below — the class
// methods that actually drive the retry loop against the Supabase client had no
// test of their own (#155). Mocking supabaseClient's `supabase.from` lets us drive
// that loop directly: first call errors with a PGRST204 "missing column", the
// class strips only that column and retries, second call succeeds.
const fromMock = vi.hoisted(() => vi.fn());
vi.mock("./supabaseClient", () => ({ supabase: { from: fromMock } }));

import { isMissingShoppingColumn, mapList, missingShoppingColumns, missingTaskColumns, shoppingItemUpdateRow, SupabaseStore } from "./supabaseStore";
import { TaskSchema } from "../schemas";

function missingColumnError(table: string, column: string) {
  return { code: "PGRST204", message: `Could not find the '${column}' column of '${table}' in the schema cache` };
}

/**
 * Regression guard for the startup-bricking bug: a single row that fails schema
 * validation must NOT take down the whole load. Before mapList, one bad row
 * threw out of `.map()` and surfaced as the permanent "Laden lukte even niet"
 * screen on every restart (CLAUDE.md §3 — degrade gracefully with partial data).
 */
describe("mapList", () => {
  afterEach(() => vi.restoreAllMocks());

  it("keeps the good rows and skips the one that throws", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const rows = [1, 2, 3, 4];
    const out = mapList(rows, (n) => {
      if (n === 3) throw new Error("nope");
      return n * 10;
    }, "number");
    expect(out).toEqual([10, 20, 40]);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("drops a schema-invalid task row but loads the valid ones", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const base = { id: "t", householdId: "h", title: "ok", planned: false };
    const rows = [
      { ...base, id: "good-1", dueDate: "2026-07-07T08:00:00Z" },
      { ...base, id: "bad", dueDate: "not-a-date" }, // fails the Iso datetime check
      { ...base, id: "good-2", dueDate: "2026-07-07T08:00:00+00:00" },
    ];
    const out = mapList(rows, (r) => TaskSchema.parse(r), "task");
    expect(out.map((t) => t.id)).toEqual(["good-1", "good-2"]);
  });

  it("returns an empty array without throwing when every row is bad", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const out = mapList([1, 2], () => { throw new Error("all bad"); }, "thing");
    expect(out).toEqual([]);
  });
});

describe("shoppingItemUpdateRow", () => {
  it("trims title and converts an empty description to null for Supabase", () => {
    expect(shoppingItemUpdateRow({ title: "  Melk  ", description: "   " })).toEqual({
      title: "Melk",
      description: null,
    });
  });

  it("passes amount/unit through, converting an explicit clear to null", () => {
    expect(shoppingItemUpdateRow({ amount: 500, unit: "ml" })).toEqual({ amount: 500, unit: "ml" });
    expect(shoppingItemUpdateRow({ amount: undefined })).toEqual({ amount: null });
  });

  it("leaves fields untouched when they are not part of the patch", () => {
    expect(shoppingItemUpdateRow({ title: "Koffie" })).toEqual({ title: "Koffie" });
  });
});

describe("isMissingShoppingColumn", () => {
  it("recognizes Supabase schema-cache misses for the optional shopping_items columns", () => {
    for (const column of ["category", "amount", "unit", "description"]) {
      expect(isMissingShoppingColumn({
        code: "PGRST204",
        message: `Could not find the '${column}' column of 'shopping_items' in the schema cache`,
      })).toBe(true);
    }
  });

  it("does not treat unrelated Supabase errors as missing-column misses", () => {
    expect(isMissingShoppingColumn({
      code: "PGRST204",
      message: "Could not find the 'title' column of 'shopping_items' in the schema cache",
    })).toBe(false);
  });
});

/**
 * Regression guard: an earlier version of this fallback dropped the WHOLE
 * category/amount/unit/description quartet whenever any one of them was
 * reported missing — so a household mid-migration (category already added,
 * description not yet) would silently discard an already-set category on
 * every insert/update, not just skip the genuinely-missing column.
 */
describe("missingShoppingColumns", () => {
  it("names only the column the error actually reports, not its siblings", () => {
    expect(missingShoppingColumns({
      code: "PGRST204",
      message: "Could not find the 'description' column of 'shopping_items' in the schema cache",
    })).toEqual(["description"]);
  });

  it("recognizes each of the optional shopping_items columns", () => {
    for (const column of ["category", "amount", "unit", "description"]) {
      expect(missingShoppingColumns({
        code: "PGRST204",
        message: `Could not find the '${column}' column of 'shopping_items' in the schema cache`,
      })).toEqual([column]);
    }
  });

  it("returns nothing for an unrelated Supabase error", () => {
    expect(missingShoppingColumns({
      code: "PGRST204",
      message: "Could not find the 'title' column of 'shopping_items' in the schema cache",
    })).toEqual([]);
    expect(missingShoppingColumns({ code: "23505", message: "duplicate key" })).toEqual([]);
  });
});

/**
 * Regression guard: an earlier version of this fallback dropped the WHOLE
 * started_at/checklist_items/picked_up_at trio whenever any one of them was
 * reported missing — so a deployment where started_at/checklist_items were
 * already migrated but picked_up_at wasn't would silently discard checklist
 * data on every insert, not just skip the genuinely-missing column.
 */
describe("missingTaskColumns", () => {
  it("names only the column the error actually reports, not its siblings", () => {
    expect(missingTaskColumns({
      code: "PGRST204",
      message: "Could not find the 'picked_up_at' column of 'tasks' in the schema cache",
    })).toEqual(["picked_up_at"]);
  });

  it("recognizes each of the optional tasks columns", () => {
    for (const column of ["started_at", "checklist_items", "picked_up_at"]) {
      expect(missingTaskColumns({
        code: "PGRST204",
        message: `Could not find the '${column}' column of 'tasks' in the schema cache`,
      })).toEqual([column]);
    }
  });

  it("returns nothing for an unrelated Supabase error", () => {
    expect(missingTaskColumns({
      code: "PGRST204",
      message: "Could not find the 'title' column of 'tasks' in the schema cache",
    })).toEqual([]);
    expect(missingTaskColumns({ code: "23505", message: "duplicate key" })).toEqual([]);
  });
});

describe("SupabaseStore retry-on-missing-column (#155)", () => {
  afterEach(() => fromMock.mockReset());

  it("createTask drops only the reported-missing column and retries, keeping the rest of the payload", async () => {
    const insertAttempt1 = vi.fn((_row: unknown) => Promise.resolve({ error: missingColumnError("tasks", "checklist_items") }));
    const insertAttempt2 = vi.fn((_row: unknown) => Promise.resolve({ error: null }));
    fromMock
      .mockReturnValueOnce({ insert: insertAttempt1 })
      .mockReturnValueOnce({ insert: insertAttempt2 });

    const store = new SupabaseStore();
    const task = await store.createTask("h1", {
      title: "Was ophangen",
      checklistItems: [{ id: "1", title: "sok", checked: false }],
    });

    expect(insertAttempt1).toHaveBeenCalledTimes(1);
    expect(insertAttempt1.mock.calls[0][0]).toMatchObject({ checklist_items: [{ id: "1", title: "sok", checked: false }] });
    expect(insertAttempt2).toHaveBeenCalledTimes(1);
    expect(insertAttempt2.mock.calls[0][0]).not.toHaveProperty("checklist_items");
    expect(task.title).toBe("Was ophangen");
  });

  it("createTask rethrows immediately on an unrelated error, without retrying", async () => {
    const insert = vi.fn(() => Promise.resolve({ error: { code: "23505", message: "duplicate key" } }));
    fromMock.mockReturnValueOnce({ insert });

    const store = new SupabaseStore();
    await expect(store.createTask("h1", { title: "Was ophangen" })).rejects.toThrow("duplicate key");
    expect(insert).toHaveBeenCalledTimes(1);
  });

  it("updateTask drops only the reported-missing column and retries", async () => {
    const chain = (result: unknown) => ({
      update: vi.fn((_row: unknown) => ({ eq: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn(() => Promise.resolve(result)) })) })) })),
    });
    const attempt1 = chain({ data: null, error: missingColumnError("tasks", "dagdeel") });
    const attempt2 = chain({
      data: { id: "t1", household_id: "h1", title: "Afwas", planned: false, checklist_items: [], picked_up_at: null, started_at: null },
      error: null,
    });
    fromMock.mockReturnValueOnce(attempt1).mockReturnValueOnce(attempt2);

    const store = new SupabaseStore();
    const task = await store.updateTask("t1", { title: "Afwas", dagdeel: "ochtend" });

    expect(task.title).toBe("Afwas");
    const firstUpdateArg = attempt1.update.mock.calls[0][0];
    expect(firstUpdateArg).toMatchObject({ dagdeel: "ochtend" });
    const secondUpdateArg = attempt2.update.mock.calls[0][0];
    expect(secondUpdateArg).not.toHaveProperty("dagdeel");
  });

  it("createShoppingItem drops only the reported-missing column and retries", async () => {
    const insertAttempt1 = vi.fn((_row: unknown) => Promise.resolve({ error: missingColumnError("shopping_items", "description") }));
    const insertAttempt2 = vi.fn((_row: unknown) => Promise.resolve({ error: null }));
    fromMock
      .mockReturnValueOnce({ insert: insertAttempt1 })
      .mockReturnValueOnce({ insert: insertAttempt2 });

    const store = new SupabaseStore();
    const item = await store.createShoppingItem("h1", { title: "Melk", description: "halfvol" });

    expect(insertAttempt1.mock.calls[0][0]).toMatchObject({ description: "halfvol" });
    expect(insertAttempt2.mock.calls[0][0]).not.toHaveProperty("description");
    expect(item.title).toBe("Melk");
  });
});
