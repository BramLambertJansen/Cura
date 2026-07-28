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

  it("still applies the update in memory when the write throws (private browsing / full quota)", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    const { result } = renderHook(() => useDailyLocalState("cura:test-e", new Set<string>(), setDecode, setEncode));
    act(() => result.current[1]((prev) => new Set(prev).add("task-1")));
    expect(result.current[0]).toEqual(new Set(["task-1"]));
  });
});
