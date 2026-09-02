// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { AiVoorstellenPage } from "./AiVoorstellenPage";
import { useCuraStore } from "../../../stores/useCuraStore";
import type { Household, Member, TaskSuggestion } from "../../../data/types";

/**
 * Smoke tests for Phase 4's AI-voorstellen page (CLAUDE.md §5 →
 * AI-voorstellen): the pending-list vs. empty state, and that accepting/
 * dismissing a row calls the right store action — never the real DataStore.
 */

const HOUSEHOLD: Household = { id: "h1", name: "Thuis", timeZone: "Europe/Amsterdam" };
const ME: Member = { id: "m1", householdId: "h1", displayName: "Bram", userId: "u1" };

const SUGGESTION: TaskSuggestion = {
  id: "s1",
  householdId: "h1",
  title: "Tandarts bellen",
  sourceNote: "uit e-mail over de tandarts",
  createdByMemberId: "m1",
  createdAt: "2026-01-15T08:00:00.000Z",
};

let initialState: ReturnType<typeof useCuraStore.getState>;

beforeEach(() => {
  initialState = useCuraStore.getState();
});

afterEach(() => {
  useCuraStore.setState(initialState, true);
});

function renderPage(taskSuggestions: TaskSuggestion[]) {
  useCuraStore.setState({
    ...useCuraStore.getState(),
    households: [HOUSEHOLD],
    members: [ME],
    currentUserId: ME.userId,
    rooms: [],
    taskSuggestions,
    acceptTaskSuggestion: vi.fn().mockResolvedValue(undefined),
    dismissTaskSuggestion: vi.fn().mockResolvedValue(undefined),
  });
  render(
    <MemoryRouter>
      <AiVoorstellenPage />
    </MemoryRouter>,
  );
}

describe("AiVoorstellenPage", () => {
  it("shows the empty state when there are no pending suggestions", () => {
    renderPage([]);

    expect(screen.getByText(/Nog geen voorstellen/i)).toBeInTheDocument();
    expect(screen.queryByText("Tandarts bellen")).not.toBeInTheDocument();
  });

  it("lists pending suggestions with a singular count heading for exactly one", () => {
    renderPage([SUGGESTION]);

    expect(screen.getByText("1 voorstel")).toBeInTheDocument();
    expect(screen.getByText("Tandarts bellen")).toBeInTheDocument();
  });

  it("uses a plural count heading for more than one suggestion", () => {
    renderPage([SUGGESTION, { ...SUGGESTION, id: "s2", title: "Planten water geven" }]);

    expect(screen.getByText("2 voorstellen")).toBeInTheDocument();
  });

  it("wires accepteren/afwijzen to the store actions with the suggestion id", async () => {
    const user = userEvent.setup();
    renderPage([SUGGESTION]);

    await user.click(screen.getByRole("button", { name: /tandarts bellen overnemen/i }));
    expect(useCuraStore.getState().acceptTaskSuggestion).toHaveBeenCalledWith("s1");

    await user.click(screen.getByRole("button", { name: /tandarts bellen afwijzen/i }));
    expect(useCuraStore.getState().dismissTaskSuggestion).toHaveBeenCalledWith("s1");
  });
});
