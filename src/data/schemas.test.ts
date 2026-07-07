import { describe, it, expect } from "vitest";
import { TaskSchema } from "./schemas";

// Regression guard: cloud mode reads `dueDate` from a Postgres `timestamptz`,
// which PostgREST serializes with a numeric offset ("+00:00"), while local mode
// writes UTC via `.toISOString()` ("Z"). Both are valid ISO 8601 and both must
// parse — the strict `z.string().datetime()` default rejected the offset form,
// which broke loading every cloud task with a wekker.
describe("TaskSchema dueDate", () => {
  const base = {
    id: "t1",
    householdId: "h1",
    title: "Afwas",
    planned: false,
  };

  it("accepts a UTC 'Z' timestamp (local mode, .toISOString())", () => {
    const r = TaskSchema.safeParse({ ...base, dueDate: "2026-07-07T08:00:00.000Z" });
    expect(r.success).toBe(true);
  });

  it("accepts a numeric-offset timestamp (cloud mode, Postgres timestamptz)", () => {
    const r = TaskSchema.safeParse({ ...base, dueDate: "2026-07-07T08:00:00+00:00" });
    expect(r.success).toBe(true);
  });

  it("accepts a non-UTC offset timestamp", () => {
    const r = TaskSchema.safeParse({ ...base, dueDate: "2026-07-07T08:00:00+02:00" });
    expect(r.success).toBe(true);
  });

  it("still rejects a non-datetime string", () => {
    const r = TaskSchema.safeParse({ ...base, dueDate: "not-a-date" });
    expect(r.success).toBe(false);
  });
});
