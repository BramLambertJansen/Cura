// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { VandaagPage } from "./VandaagPage";
import { useCuraStore } from "../../../stores/useCuraStore";
import { SheetContext, type SheetActions } from "../../sheetContext";
import type { Household, Member, Task } from "../../../data/types";

/**
 * Smoke tests for CLAUDE.md §5 Vandaag's dagdeel-tijdlijn: the "current
 * dagdeel" vs. "Later vandaag" split (splitDagdelen) and the empty state.
 * Store data flows straight from useCuraStore (as the real app does), with
 * only the write actions swapped for spies — clicking a row must call the
 * right store action with the right args, without exercising the real
 * DataStore backend.
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

function renderVandaag() {
  const sheets = sheetActions();
  render(
    <MemoryRouter>
      <SheetContext.Provider value={sheets}>
        <VandaagPage />
      </SheetContext.Provider>
    </MemoryRouter>,
  );
  return { sheets };
}

let initialState: ReturnType<typeof useCuraStore.getState>;

beforeEach(() => {
  initialState = useCuraStore.getState();
  // Fixed instant so `dagdeelForHour(new Date().getHours())` (VandaagPage's
  // "nu") is deterministic — 09:00 local is always "ochtend", regardless of
  // the machine/CI timezone, since both the fake clock and the assertions
  // below are read off the same Date.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 0, 15, 9, 0, 0));
});

afterEach(() => {
  vi.useRealTimers();
  useCuraStore.setState(initialState, true);
});

function setTasks(tasks: Task[], overrides: Partial<ReturnType<typeof useCuraStore.getState>> = {}) {
  useCuraStore.setState({
    ...useCuraStore.getState(),
    households: [HOUSEHOLD],
    members: [ME, HOUSEMATE],
    currentUserId: ME.userId,
    rooms: [],
    tasks,
    completions: [],
    bundles: [],
    toggleTask: vi.fn().mockResolvedValue(undefined),
    updateTask: vi.fn().mockResolvedValue(true),
    ...overrides,
  });
}

describe("VandaagPage", () => {
  it("shows the current dagdeel's tasks and tucks a later one behind Later vandaag", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    setTasks([
      { id: "t-ochtend", householdId: "h1", title: "Afwas doen", planned: true, dagdeel: "ochtend", checklistItems: [] },
      { id: "t-avond", householdId: "h1", title: "Vuilnis buiten zetten", planned: true, dagdeel: "avond", checklistItems: [] },
    ]);

    renderVandaag();

    expect(screen.getByText("Afwas doen")).toBeInTheDocument();
    expect(screen.queryByText("Vuilnis buiten zetten")).not.toBeInTheDocument();

    const laterToggle = screen.getByRole("button", { name: /later vandaag/i });
    expect(laterToggle).toHaveAttribute("aria-expanded", "false");
    expect(within(laterToggle).getByText("1")).toBeInTheDocument();

    await user.click(laterToggle);

    expect(laterToggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Vuilnis buiten zetten")).toBeInTheDocument();
  });

  it("shows the calm empty state when nothing is planned", () => {
    setTasks([]);

    renderVandaag();

    expect(screen.getByText(/niets op de planning\./i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /later vandaag/i })).not.toBeInTheDocument();
  });

  it("keeps useful suggestions glanceable by default", () => {
    setTasks([
      { id: "t-short", householdId: "h1", title: "Planten water geven", planned: false, durationMin: 5, checklistItems: [] },
    ]);

    renderVandaag();

    expect(screen.getByRole("button", { name: /misschien handig/i })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Planten water geven")).toBeInTheDocument();
  });

  it("calls toggleTask with the task id when its checkbox is ticked", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    setTasks([
      { id: "t-ochtend", householdId: "h1", title: "Afwas doen", planned: true, dagdeel: "ochtend", checklistItems: [] },
    ]);

    renderVandaag();
    await user.click(screen.getByRole("checkbox", { name: /afwas doen afvinken/i }));

    expect(useCuraStore.getState().toggleTask).toHaveBeenCalledWith("t-ochtend", true);
  });

  it("moves a completed task into the collapsed Afgerond section", () => {
    setTasks([
      { id: "t-done", householdId: "h1", title: "Stofzuigen", planned: true, checklistItems: [] },
    ], {
      completions: [{ id: "c1", taskId: "t-done", completedById: "m1", completedAt: "2026-01-15T08:00:00.000Z" }],
    });

    renderVandaag();

    // Done tasks live in a collapsed-by-default CollapsibleSection, not the open list.
    expect(screen.queryByText("Stofzuigen")).not.toBeInTheDocument();
    const afgerondToggle = screen.getByRole("button", { name: /afgerond/i });
    expect(within(afgerondToggle).getByText("1")).toBeInTheDocument();
  });
});
