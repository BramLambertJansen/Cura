import { describe, it, expect, vi, afterEach } from "vitest";
import { isMissingShoppingCategoryColumn, mapList, shoppingItemUpdateRow } from "./supabaseStore";
import { TaskSchema } from "../schemas";

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
  it("trims title and converts an empty quantity to null for Supabase", () => {
    expect(shoppingItemUpdateRow({ title: "  Melk  ", quantity: "   " })).toEqual({
      title: "Melk",
      quantity: null,
    });
  });

  it("leaves quantity untouched when it is not part of the patch", () => {
    expect(shoppingItemUpdateRow({ title: "Koffie" })).toEqual({ title: "Koffie" });
  });
});

describe("isMissingShoppingCategoryColumn", () => {
  it("recognizes Supabase schema-cache misses for shopping_items.category", () => {
    expect(isMissingShoppingCategoryColumn({
      code: "PGRST204",
      message: "Could not find the 'category' column of 'shopping_items' in the schema cache",
    })).toBe(true);
  });

  it("does not treat unrelated Supabase errors as category-cache misses", () => {
    expect(isMissingShoppingCategoryColumn({
      code: "PGRST204",
      message: "Could not find the 'title' column of 'shopping_items' in the schema cache",
    })).toBe(false);
  });
});
