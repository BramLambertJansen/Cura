import { describe, expect, it } from "vitest";
import { getDismissedTaskStorageKey, parseDismissedTaskIds, serializeDismissedTaskIds } from "./useTaskDismissals";

describe("task dismiss helpers", () => {
  it("serializes and parses dismissed ids", () => {
    const ids = new Set(["task-1", "task-2"]);
    expect(parseDismissedTaskIds(serializeDismissedTaskIds(ids))).toEqual(ids);
  });

  it("creates a date-scoped storage key", () => {
    expect(getDismissedTaskStorageKey(new Date("2026-07-02T12:00:00.000Z"))).toBe("cura:task-dismissed:2026-07-02");
  });
});
