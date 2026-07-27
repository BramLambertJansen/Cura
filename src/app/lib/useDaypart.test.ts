// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

// Mocked so every test controls transitions directly instead of juggling real
// system time — useDaypart.ts's module-level `cachedDaypart` is computed once
// at import time, so the mock's default return value must be set before that
// happens (vi.hoisted runs before imports).
const getDaypartMock = vi.hoisted(() => vi.fn<() => "ochtend" | "middag" | "avond">(() => "ochtend"));
vi.mock("./format", () => ({ getDaypart: getDaypartMock }));

import { useDaypart } from "./useDaypart";

beforeEach(() => {
  vi.useFakeTimers();
  getDaypartMock.mockReturnValue("ochtend");
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useDaypart (#158 — one shared subscription, not one setInterval per call site)", () => {
  it("returns the current daypart on mount", () => {
    const { result } = renderHook(() => useDaypart());
    expect(result.current).toBe("ochtend");
  });

  it("updates after a minute tick reports a new daypart", () => {
    const { result } = renderHook(() => useDaypart());
    expect(result.current).toBe("ochtend");

    getDaypartMock.mockReturnValue("middag");
    act(() => { vi.advanceTimersByTime(60_000); });

    expect(result.current).toBe("middag");
  });

  it("shares one interval across multiple simultaneous instances, notifying both", () => {
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
    const a = renderHook(() => useDaypart());
    const b = renderHook(() => useDaypart());

    expect(setIntervalSpy).toHaveBeenCalledTimes(1);

    getDaypartMock.mockReturnValue("avond");
    act(() => { vi.advanceTimersByTime(60_000); });

    expect(a.result.current).toBe("avond");
    expect(b.result.current).toBe("avond");
    setIntervalSpy.mockRestore();
  });

  it("clears the shared interval once the last subscriber unmounts, and starts a fresh one for the next mount", () => {
    const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");
    const { unmount } = renderHook(() => useDaypart());
    unmount();
    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);

    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
    renderHook(() => useDaypart());
    expect(setIntervalSpy).toHaveBeenCalledTimes(1);

    clearIntervalSpy.mockRestore();
    setIntervalSpy.mockRestore();
  });

  it("doesn't notify (or re-render) when the tick reports the same daypart", () => {
    const { result } = renderHook(() => useDaypart());
    const before = result.current;

    getDaypartMock.mockReturnValue("ochtend"); // unchanged
    act(() => { vi.advanceTimersByTime(60_000); });

    expect(result.current).toBe(before);
  });
});
