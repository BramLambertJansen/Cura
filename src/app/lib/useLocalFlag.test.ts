// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useLocalFlag } from "./useLocalFlag";

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("useLocalFlag (#162)", () => {
  it("starts unseen when nothing is stored yet", () => {
    const { result } = renderHook(() => useLocalFlag("cura:test-flag-a"));
    expect(result.current.seen).toBe(false);
  });

  it("mark() flips to seen and a fresh hook instance reads it back as seen", () => {
    const { result } = renderHook(() => useLocalFlag("cura:test-flag-b"));
    act(() => result.current.mark());
    expect(result.current.seen).toBe(true);

    const second = renderHook(() => useLocalFlag("cura:test-flag-b"));
    expect(second.result.current.seen).toBe(true);
  });

  it("still flips to seen in memory when the write throws (private browsing / full quota)", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    const { result } = renderHook(() => useLocalFlag("cura:test-flag-c"));
    act(() => result.current.mark());
    expect(result.current.seen).toBe(true);
  });
});
