import { describe, expect, it } from "vitest";
import { formatCountdown, getDaypart } from "./format";

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

describe("getDaypart", () => {
  it("splits at the same boundaries as getGreeting's ochtend/middag/avond copy", () => {
    expect(getDaypart(6)).toBe("ochtend");
    expect(getDaypart(11)).toBe("ochtend");
    expect(getDaypart(12)).toBe("middag");
    expect(getDaypart(16)).toBe("middag");
    expect(getDaypart(17)).toBe("avond");
    expect(getDaypart(20)).toBe("avond");
  });

  it("folds the overnight stretch into avond — no separate night variant", () => {
    expect(getDaypart(23)).toBe("avond");
    expect(getDaypart(0)).toBe("avond");
    expect(getDaypart(5)).toBe("avond");
  });
});
