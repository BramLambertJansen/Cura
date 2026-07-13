import { describe, expect, it } from "vitest";
import { FREE_UNIT_DEFAULT, parseDraftAmount } from "./shoppingDraft";

describe("parseDraftAmount", () => {
  it("uses the stepper count for stuks", () => {
    expect(parseDraftAmount("stuks", 3, "")).toBe(3);
    expect(parseDraftAmount("stuks", 1, "ignored")).toBe(1);
  });

  it("rejects a non-positive stuks count", () => {
    expect(parseDraftAmount("stuks", 0, "")).toBeNull();
  });

  it("parses free-unit text with a dot or an NL comma", () => {
    expect(parseDraftAmount("g", 1, "500")).toBe(500);
    expect(parseDraftAmount("kg", 1, "1,5")).toBe(1.5);
    expect(parseDraftAmount("l", 1, "0.5")).toBe(0.5);
  });

  it("rejects empty or invalid free-unit text", () => {
    expect(parseDraftAmount("g", 1, "")).toBeNull();
    expect(parseDraftAmount("ml", 1, "abc")).toBeNull();
    expect(parseDraftAmount("l", 1, "0")).toBeNull();
  });

  it("exposes realistic free-unit defaults", () => {
    expect(FREE_UNIT_DEFAULT.g).toBe(500);
    expect(FREE_UNIT_DEFAULT.l).toBe(1);
  });
});
