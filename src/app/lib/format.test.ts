import { describe, expect, it } from "vitest";
import { formatCountdown } from "./format";

describe("formatCountdown", () => {
  it("formats minutes and zero-padded seconds", () => {
    expect(formatCountdown(25 * 60)).toBe("25:00");
    expect(formatCountdown(60 + 5)).toBe("1:05");
    expect(formatCountdown(59)).toBe("0:59");
  });

  it("clamps to zero, never negative", () => {
    expect(formatCountdown(0)).toBe("0:00");
    expect(formatCountdown(-30)).toBe("0:00");
  });

  it("floors fractional seconds", () => {
    expect(formatCountdown(90.9)).toBe("1:30");
  });
});
