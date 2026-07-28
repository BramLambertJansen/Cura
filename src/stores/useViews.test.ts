// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { useCuraStore } from "./useCuraStore";
import { useCurrentMember } from "./useViews";
import type { Member } from "../data/types";

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
