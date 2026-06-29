import { useMemo } from "react";
import { useCuraStore } from "./useCuraStore";
import { toActivityFeed, toRoomView, toRoutineView, toTaskView } from "../data/selectors";
import type { ActivityView, RoomView, RoutineView, TaskView } from "../data/types";

/** Every task as a view-model — done/dueHint/claimedBy resolved, never stored. */
export function useTaskViews(): TaskView[] {
  const tasks = useCuraStore((s) => s.tasks);
  const completions = useCuraStore((s) => s.completions);
  const rooms = useCuraStore((s) => s.rooms);
  const members = useCuraStore((s) => s.members);
  return useMemo(
    () => tasks.map((t) => toTaskView(t, completions, rooms, members)),
    [tasks, completions, rooms, members],
  );
}

/** Rooms with their pooled tasks and a soft, honest hint. */
export function useRoomViews(): RoomView[] {
  const rooms = useCuraStore((s) => s.rooms);
  const tasks = useCuraStore((s) => s.tasks);
  const completions = useCuraStore((s) => s.completions);
  const members = useCuraStore((s) => s.members);
  return useMemo(
    () => rooms.map((r) => toRoomView(r, tasks, completions, members)),
    [rooms, tasks, completions, members],
  );
}

/** Routines (bundles) with rolling density — never a streak. */
export function useRoutineViews(): RoutineView[] {
  const bundles = useCuraStore((s) => s.bundles);
  const tasks = useCuraStore((s) => s.tasks);
  const completions = useCuraStore((s) => s.completions);
  const members = useCuraStore((s) => s.members);
  return useMemo(
    () => bundles.map((b) => toRoutineView(b, tasks, completions, members)),
    [bundles, tasks, completions, members],
  );
}

/** Recent completions as a calm chronological feed for Samen. */
export function useActivityFeed(sinceIso?: string): ActivityView[] {
  const completions = useCuraStore((s) => s.completions);
  const tasks = useCuraStore((s) => s.tasks);
  const rooms = useCuraStore((s) => s.rooms);
  const members = useCuraStore((s) => s.members);
  return useMemo(
    () => toActivityFeed(completions, tasks, rooms, members, sinceIso),
    [completions, tasks, rooms, members, sinceIso],
  );
}
