// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { HuisPage } from "./HuisPage";
import { useCuraStore } from "../../../stores/useCuraStore";
import { SheetContext, type SheetActions } from "../../sheetContext";
import type { Household, Member, Room, Task } from "../../../data/types";

/**
 * Smoke tests for CLAUDE.md §5 Huis's list view: the merged "Alle taken" +
 * "Kamers" home and the room/duration filters. Room detail (`/huis/:roomId`)
 * is its own page, RoomDetailPage — see RoomDetailPage.test.tsx (#156 split
 * the old dual-purpose HuisPage in two).
 */

const HOUSEHOLD: Household = { id: "h1", name: "Thuis", timeZone: "Europe/Amsterdam" };
const ME: Member = { id: "m1", householdId: "h1", displayName: "Bram", userId: "u1" };

const KEUKEN: Room = { id: "r-keuken", householdId: "h1", name: "Keuken", iconKey: "utensils", color: "#B8924A" };
const BADKAMER: Room = { id: "r-badkamer", householdId: "h1", name: "Badkamer", iconKey: "droplets", color: "#5A8FA8" };

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

function renderHuis() {
  const sheets = sheetActions();
  render(
    <MemoryRouter initialEntries={["/huis"]}>
      <SheetContext.Provider value={sheets}>
        <HuisPage />
      </SheetContext.Provider>
    </MemoryRouter>,
  );
  return { sheets };
}

let initialState: ReturnType<typeof useCuraStore.getState>;

beforeEach(() => {
  initialState = useCuraStore.getState();
});

afterEach(() => {
  useCuraStore.setState(initialState, true);
});

function setFixture(rooms: Room[], tasks: Task[]) {
  useCuraStore.setState({
    ...useCuraStore.getState(),
    households: [HOUSEHOLD],
    members: [ME],
    currentUserId: ME.userId,
    rooms,
    tasks,
    completions: [],
    bundles: [],
    toggleTask: vi.fn().mockResolvedValue(undefined),
    updateTask: vi.fn().mockResolvedValue(true),
    claimTask: vi.fn().mockResolvedValue(undefined),
  });
}

describe("HuisPage — list view", () => {
  it("shows the household-wide open count and every room in the Kamers grid", () => {
    setFixture(
      [KEUKEN, BADKAMER],
      [
        { id: "t1", householdId: "h1", title: "Afwassen", roomId: "r-keuken", planned: false, checklistItems: [] },
        { id: "t2", householdId: "h1", title: "Douche schoonmaken", roomId: "r-badkamer", planned: false, checklistItems: [] },
      ],
    );

    renderHuis();

    expect(screen.getByText("Alle taken")).toBeInTheDocument();
    expect(screen.getByText("2 open")).toBeInTheDocument();
    expect(screen.getByText("Afwassen")).toBeInTheDocument();
    expect(screen.getByText("Douche schoonmaken")).toBeInTheDocument();
    // KamerKaart exposes the room name via its accessible name, not plain
    // text — the row's own "Keuken"/"Badkamer" room-label span reuses the
    // same string, so a plain getByText would match twice.
    expect(screen.getByRole("button", { name: /^Keuken,/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Badkamer,/ })).toBeInTheDocument();
  });

  it("filters the open task list down to a single room", async () => {
    const user = userEvent.setup();
    setFixture(
      [KEUKEN, BADKAMER],
      [
        { id: "t1", householdId: "h1", title: "Afwassen", roomId: "r-keuken", planned: false, checklistItems: [] },
        { id: "t2", householdId: "h1", title: "Douche schoonmaken", roomId: "r-badkamer", planned: false, checklistItems: [] },
      ],
    );

    renderHuis();
    await user.click(screen.getByRole("button", { name: /filters/i }));
    // Two "Badkamer" chips exist once filters are open (the filter chip and the
    // Kamers grid card) — the filter row is the one inside the filter chip list.
    await user.click(screen.getAllByText("Badkamer")[0]);

    expect(screen.getByText("Douche schoonmaken")).toBeInTheDocument();
    expect(screen.queryByText("Afwassen")).not.toBeInTheDocument();
  });

  it("shows a calm 'geen taken' message when the filter matches nothing", async () => {
    const user = userEvent.setup();
    setFixture(
      [KEUKEN],
      [{ id: "t1", householdId: "h1", title: "Afwassen", roomId: "r-keuken", durationMin: 5, planned: false, checklistItems: [] }],
    );

    renderHuis();
    await user.click(screen.getByRole("button", { name: /filters/i }));
    await user.click(screen.getByText("45+ min"));

    expect(screen.getByText("Geen taken gevonden")).toBeInTheDocument();
    expect(screen.queryByText("Afwassen")).not.toBeInTheDocument();
  });
});
