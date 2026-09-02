// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { MeerPage } from "./MeerPage";
import { useCuraStore } from "../../../stores/useCuraStore";
import { SheetContext, type SheetActions } from "../../sheetContext";
import type { Household, Member } from "../../../data/types";

/**
 * Meer is Samen's list entry point (CLAUDE.md §5 Meer), and Samen only exists
 * once a housemate actually joined — so the "Samen"-group must appear/disappear
 * with the second Member row, while the rest of the page stays untouched.
 */

const HOUSEHOLD: Household = { id: "h1", name: "Thuis", timeZone: "Europe/Amsterdam" };
const ME: Member = { id: "m1", householdId: "h1", displayName: "Bram", userId: "u1" };
const HOUSEMATE: Member = { id: "m2", householdId: "h1", displayName: "Stéphanie" };

function sheetActions(): SheetActions {
  return {
    openAddTask: vi.fn(),
    openAddBoodschap: vi.fn(),
    openEditTask: vi.fn(),
    openNewRoom: vi.fn(),
    openEditRoom: vi.fn(),
    openNewRoutine: vi.fn(),
    openEditRoutine: vi.fn(),
    openHousehold: vi.fn(),
    openProfiel: vi.fn(),
  };
}

let initialState: ReturnType<typeof useCuraStore.getState>;

beforeEach(() => {
  initialState = useCuraStore.getState();
});

afterEach(() => {
  useCuraStore.setState(initialState, true);
});

function renderMeer(members: Member[]) {
  useCuraStore.setState({ ...useCuraStore.getState(), households: [HOUSEHOLD], members, currentUserId: ME.userId });
  render(
    <MemoryRouter>
      <SheetContext.Provider value={sheetActions()}>
        <MeerPage />
      </SheetContext.Provider>
    </MemoryRouter>,
  );
}

describe("MeerPage", () => {
  it("hides the Samen entry in a household of one", () => {
    renderMeer([ME]);

    expect(screen.queryByRole("button", { name: "Samen" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Boodschappen" })).toBeInTheDocument();
  });

  it("shows the Samen entry once a housemate joined", () => {
    renderMeer([ME, HOUSEMATE]);

    expect(screen.getByRole("button", { name: "Samen" })).toBeInTheDocument();
  });
});

/** Phase 4 (AI-voorstellen, CLAUDE.md §5) — the "Meer" list entry's pending-count badge. */
describe("MeerPage — AI-voorstellen badge", () => {
  it("shows no count badge when there are no pending suggestions", () => {
    renderMeer([ME]);

    const item = screen.getByRole("button", { name: "AI-voorstellen" });
    expect(item).toBeInTheDocument();
    expect(within(item).queryByText(/^\d+$/)).not.toBeInTheDocument();
  });

  it("shows the pending count as a badge and folds it into the accessible name", () => {
    useCuraStore.setState({
      ...useCuraStore.getState(),
      households: [HOUSEHOLD],
      members: [ME],
      currentUserId: ME.userId,
      taskSuggestions: [
        { id: "s1", householdId: "h1", title: "Tandarts bellen", sourceNote: "uit e-mail", createdByMemberId: "m1", createdAt: "2026-01-15T08:00:00.000Z" },
        { id: "s2", householdId: "h1", title: "Planten water geven", sourceNote: "uit e-mail", createdByMemberId: "m1", createdAt: "2026-01-15T08:00:00.000Z" },
      ],
    });
    render(
      <MemoryRouter>
        <SheetContext.Provider value={sheetActions()}>
          <MeerPage />
        </SheetContext.Provider>
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: "AI-voorstellen, 2 nieuw" })).toBeInTheDocument();
  });
});
