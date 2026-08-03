// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { dailyStorageKey, useDailyLocalState } from "./useDailyLocalState";

const setDecode = (raw: string): Set<string> => new Set(JSON.parse(raw));
const setEncode = (value: Set<string>): string => JSON.stringify([...value]);

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("dailyStorageKey (#162)", () => {
  it("scopes the key to the given date", () => {
    expect(dailyStorageKey("cura:task-dismissed", new Date("2026-07-02T12:00:00.000Z"))).toBe("cura:task-dismissed:2026-07-02");
  });
});

describe("useDailyLocalState (#162)", () => {
  it("starts empty when nothing is stored yet", () => {
    const { result } = renderHook(() => useDailyLocalState("cura:test-a", new Set<string>(), setDecode, setEncode));
    expect(result.current[0]).toEqual(new Set());
  });

  it("persists an update and a fresh hook instance picks it up", () => {
    const { result } = renderHook(() => useDailyLocalState("cura:test-b", new Set<string>(), setDecode, setEncode));
    act(() => result.current[1]((prev) => new Set(prev).add("task-1")));
    expect(result.current[0]).toEqual(new Set(["task-1"]));

    const second = renderHook(() => useDailyLocalState("cura:test-b", new Set<string>(), setDecode, setEncode));
    expect(second.result.current[0]).toEqual(new Set(["task-1"]));
  });

  it("skips the write when the updater returns the same reference (no-op guard)", () => {
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
    const { result } = renderHook(() => useDailyLocalState("cura:test-c", new Set<string>(), setDecode, setEncode));
    act(() => result.current[1]((prev) => prev)); // no-op updater
    expect(setItemSpy).not.toHaveBeenCalled();
  });

  it("falls back to the empty value when the stored JSON is corrupt", () => {
    localStorage.setItem(dailyStorageKey("cura:test-d"), "{not json");
    const { result } = renderHook(() => useDailyLocalState("cura:test-d", new Set<string>(), setDecode, setEncode));
    expect(result.current[0]).toEqual(new Set());
  });

  // #212 review: de "niet vandaag"-toast belooft dat de taak morgen weer
  // terugkomt. Bleef het tabblad over middernacht open, dan hield de hook de
  // dismissals van gisteren vast omdat niets de nieuw gedateerde sleutel las.
  it("drops yesterday's value when the local day rolls over while mounted", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      vi.setSystemTime(new Date("2026-07-02T12:00:00.000Z"));
      const { result, rerender } = renderHook(() =>
        useDailyLocalState("cura:test-rollover", new Set<string>(), setDecode, setEncode),
      );
      act(() => result.current[1]((prev) => new Set(prev).add("task-1")));
      expect(result.current[0]).toEqual(new Set(["task-1"]));

      vi.setSystemTime(new Date("2026-07-03T00:05:00.000Z"));
      rerender(); // de volgende render die de pagina toch al doet (Vandaag tikt per minuut)

      expect(result.current[0]).toEqual(new Set());
      // Gisteren's sleutel blijft staan (die ruimt de browser zelf op) — hij
      // wordt alleen niet meer gelezen.
      expect(localStorage.getItem("cura:test-rollover:2026-07-02")).toBe('["task-1"]');
    } finally {
      vi.useRealTimers();
    }
  });

  it("writes under today's key when the first update lands after a rollover", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      vi.setSystemTime(new Date("2026-07-02T12:00:00.000Z"));
      const { result } = renderHook(() =>
        useDailyLocalState("cura:test-rollover-write", new Set<string>(), setDecode, setEncode),
      );
      act(() => result.current[1]((prev) => new Set(prev).add("task-1")));

      // Geen rerender vóór de write: de updater moet zelf op vandaag uitkomen.
      vi.setSystemTime(new Date("2026-07-03T00:05:00.000Z"));
      act(() => result.current[1]((prev) => new Set(prev).add("task-2")));

      expect(localStorage.getItem("cura:test-rollover-write:2026-07-03")).toBe('["task-2"]');
      expect(result.current[0]).toEqual(new Set(["task-2"]));
    } finally {
      vi.useRealTimers();
    }
  });

  it("still applies the update in memory when the write throws (private browsing / full quota)", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    const { result } = renderHook(() => useDailyLocalState("cura:test-e", new Set<string>(), setDecode, setEncode));
    act(() => result.current[1]((prev) => new Set(prev).add("task-1")));
    expect(result.current[0]).toEqual(new Set(["task-1"]));
  });
});
