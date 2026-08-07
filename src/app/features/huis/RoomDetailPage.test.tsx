// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { RoomDetailPage } from "./RoomDetailPage";
import { useCuraStore } from "../../../stores/useCuraStore";
import { SheetContext, type SheetActions } from "../../sheetContext";
import type { Household, Member, Room, Task, TaskCompletion } from "../../../data/types";

/**
 * Smoke tests for CLAUDE.md §5 Huis's room-detail view (`/huis/:roomId`),
 * split out of the old dual-purpose HuisPage into its own page (#156).
 */

const HOUSEHOLD: Household = { id: "h1", name: "Thuis", timeZone: "Europe/Amsterdam" };
const ME: Member = { id: "m1", householdId: "h1", displayName: "Bram", userId: "u1" };

const KEUKEN: Room = { id: "r-keuken", householdId: "h1", name: "Keuken", iconKey: "utensils", color: "#B8924A", quickAddTemplates: [] };
const BADKAMER: Room = { id: "r-badkamer", householdId: "h1", name: "Badkamer", iconKey: "droplets", color: "#5A8FA8", quickAddTemplates: [] };

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

function renderRoomDetail(roomId: string) {
  const sheets = sheetActions();
  render(
    <MemoryRouter initialEntries={[`/huis/${roomId}`]}>
      <SheetContext.Provider value={sheets}>
        <Routes>
          <Route path="/huis" element={<div>Huis-lijst</div>} />
          <Route path="/huis/:roomId" element={<RoomDetailPage />} />
        </Routes>
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

function setFixture(rooms: Room[], tasks: Task[], completions: TaskCompletion[] = []) {
  useCuraStore.setState({
    ...useCuraStore.getState(),
    households: [HOUSEHOLD],
    members: [ME],
    currentUserId: ME.userId,
    rooms,
    tasks,
    completions,
    bundles: [],
    toggleTask: vi.fn().mockResolvedValue(undefined),
    updateTask: vi.fn().mockResolvedValue(true),
    claimTask: vi.fn().mockResolvedValue(undefined),
    createTasksFromTemplates: vi.fn().mockResolvedValue(undefined),
  });
}

describe("RoomDetailPage", () => {
  it("renders the room's own tasks plus quick-add rows for templates not yet used", () => {
    setFixture(
      [KEUKEN],
      [{ id: "t1", householdId: "h1", title: "Afwassen", roomId: "r-keuken", planned: false, checklistItems: [] }],
    );

    renderRoomDetail("r-keuken");

    expect(screen.getByRole("heading", { name: "Keuken" })).toBeInTheDocument();
    expect(screen.getByText("Afwassen")).toBeInTheDocument();
    // "Afwassen" is already a task in this room, so it must not also be offered
    // as a quick-add suggestion — only still-unused keuken templates should show.
    expect(screen.getByText("Snel toevoegen")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Afwassen" })).not.toBeInTheDocument();
    expect(screen.getByText("Aanrecht schoonvegen")).toBeInTheDocument();
  });

  it("shows a room's own managed quick-add list in full instead of the category default, uncapped at 2", () => {
    const keukenWithOwnList: Room = {
      ...KEUKEN,
      quickAddTemplates: [
        { title: "Kattenbak verversen" },
        { title: "Planten water geven" },
        { title: "Ramen zemen" },
      ],
    };
    setFixture([keukenWithOwnList], []);

    renderRoomDetail("r-keuken");

    expect(screen.getByText("Kattenbak verversen")).toBeInTheDocument();
    expect(screen.getByText("Planten water geven")).toBeInTheDocument();
    expect(screen.getByText("Ramen zemen")).toBeInTheDocument();
    // The static category default must not leak in alongside the room's own list.
    expect(screen.queryByText("Aanrecht schoonvegen")).not.toBeInTheDocument();
  });

  it("always offers a way to manage the quick-add list, even with nothing left to suggest", async () => {
    const user = userEvent.setup();
    const keukenEmptiedOut: Room = { ...KEUKEN, quickAddTemplates: [{ title: "Al toegevoegd" }] };
    setFixture(
      [keukenEmptiedOut],
      [{ id: "t1", householdId: "h1", title: "Al toegevoegd", roomId: "r-keuken", planned: false, checklistItems: [] }],
    );

    const { sheets } = renderRoomDetail("r-keuken");

    expect(screen.getByText("Snel toevoegen")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Sneltoevoegen-taken van Keuken beheren" }));
    expect(sheets.openEditRoom).toHaveBeenCalledWith("r-keuken");
  });

  it("shows the empty illustration when a room has no tasks yet", () => {
    setFixture([BADKAMER], []);

    renderRoomDetail("r-badkamer");

    expect(screen.getByRole("heading", { name: "Badkamer" })).toBeInTheDocument();
    expect(screen.getByText("Nog geen taken in deze kamer.")).toBeInTheDocument();
  });

  it("tucks completed tasks behind a collapsed Afgerond section", async () => {
    const user = userEvent.setup();
    setFixture(
      [KEUKEN],
      [
        { id: "t1", householdId: "h1", title: "Afwassen", roomId: "r-keuken", planned: false, checklistItems: [] },
        { id: "t2", householdId: "h1", title: "Aanrecht afnemen", roomId: "r-keuken", planned: false, checklistItems: [] },
      ],
      [{ id: "c1", taskId: "t2", completedById: "m1", completedAt: new Date().toISOString() }],
    );

    renderRoomDetail("r-keuken");

    // Open task shows directly; the done one is hidden behind the collapsed toggle.
    expect(screen.getByText("Afwassen")).toBeInTheDocument();
    expect(screen.getByText("Afgerond")).toBeInTheDocument();
    expect(screen.queryByText("Aanrecht afnemen")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Afgerond/ }));

    expect(screen.getByText("Aanrecht afnemen")).toBeInTheDocument();
  });

  it("bounces back to the room list for a stale/unknown roomId instead of a broken page", () => {
    setFixture([KEUKEN], []);

    renderRoomDetail("does-not-exist");

    expect(screen.getByText("Huis-lijst")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Keuken" })).not.toBeInTheDocument();
  });
});
