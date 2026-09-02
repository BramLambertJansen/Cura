// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { useCuraStore } from "./useCuraStore";
import { useCurrentMember, useTaskSuggestionViews } from "./useViews";
import type { Member, Room, TaskSuggestion } from "../data/types";

/** Regression guard for #157: the "who am I" lookup, now shared by 6 call sites. */

const member = (overrides: Partial<Member> = {}): Member => ({
  id: "m1", householdId: "h1", displayName: "Bram", ...overrides,
});

let initialState: ReturnType<typeof useCuraStore.getState>;

beforeEach(() => {
  initialState = useCuraStore.getState();
});

afterEach(() => {
  useCuraStore.setState(initialState, true);
});

describe("useCurrentMember", () => {
  it("resolves the member whose userId matches currentUserId", () => {
    const me = member({ id: "m1", userId: "u1", displayName: "Bram" });
    const housemate = member({ id: "m2", userId: "u2", displayName: "Stéphanie" });
    useCuraStore.setState({ members: [housemate, me], currentUserId: "u1" });

    const { result } = renderHook(() => useCurrentMember());

    expect(result.current).toEqual(me);
  });

  it("returns undefined when no member's userId matches (not yet loaded, or a local-mode housemate without an account)", () => {
    const housemate = member({ id: "m2", userId: undefined, displayName: "Stéphanie" });
    useCuraStore.setState({ members: [housemate], currentUserId: "u1" });

    const { result } = renderHook(() => useCurrentMember());

    expect(result.current).toBeUndefined();
  });

  it("re-resolves when currentUserId changes (e.g. after signing in)", () => {
    const memberA = member({ id: "m1", userId: "u1" });
    const memberB = member({ id: "m2", userId: "u2" });
    useCuraStore.setState({ members: [memberA, memberB], currentUserId: "u1" });

    const { result, rerender } = renderHook(() => useCurrentMember());
    expect(result.current?.id).toBe("m1");

    useCuraStore.setState({ currentUserId: "u2" });
    rerender();

    expect(result.current?.id).toBe("m2");
  });
});

/** Phase 4 (AI-voorstellen, CLAUDE.md §5) — the view-model hook backing Vandaag/AiVoorstellenPage. */
describe("useTaskSuggestionViews", () => {
  const room: Room = { id: "r1", householdId: "h1", name: "Keuken", iconKey: "keuken", color: "#ccc", quickAddTemplates: [] };
  const me: Member = { id: "m1", householdId: "h1", displayName: "Bram", userId: "u1" };
  const suggestion: TaskSuggestion = {
    id: "s1", householdId: "h1", title: "Tandarts bellen", roomId: "r1",
    sourceNote: "uit e-mail over de tandarts", createdByMemberId: "m1", createdAt: "2026-01-15T08:00:00.000Z",
  };

  it("maps pending suggestions to view-models, resolving room/creator names", () => {
    useCuraStore.setState({ taskSuggestions: [suggestion], rooms: [room], members: [me] });

    const { result } = renderHook(() => useTaskSuggestionViews());

    expect(result.current).toEqual([
      expect.objectContaining({ id: "s1", title: "Tandarts bellen", room: "Keuken", createdBy: "Bram" }),
    ]);
  });

  it("returns an empty list when there are no pending suggestions", () => {
    useCuraStore.setState({ taskSuggestions: [], rooms: [room], members: [me] });

    const { result } = renderHook(() => useTaskSuggestionViews());

    expect(result.current).toEqual([]);
  });

  it("re-derives when a suggestion is accepted/dismissed (removed from the store)", () => {
    useCuraStore.setState({ taskSuggestions: [suggestion], rooms: [room], members: [me] });

    const { result, rerender } = renderHook(() => useTaskSuggestionViews());
    expect(result.current).toHaveLength(1);

    useCuraStore.setState({ taskSuggestions: [] });
    rerender();

    expect(result.current).toHaveLength(0);
  });
});
