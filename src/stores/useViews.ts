import { useMemo } from "react";
import { useCuraStore } from "./useCuraStore";
import { buildLatestCompletionMap, toActivityFeed, toRoomView, toRoutineView, toTaskView } from "../data/selectors";
import type { ActivityView, RoomView, RoutineView, TaskView } from "../data/types";

/** Every task as a view-model — done/dueHint/claimedBy resolved, never stored. */
export function useTaskViews(): TaskView[] {
  const tasks = useCuraStore((s) => s.tasks);
  const completions = useCuraStore((s) => s.completions);
  const rooms = useCuraStore((s) => s.rooms);
  const members = useCuraStore((s) => s.members);
  const latestByTask = useMemo(() => buildLatestCompletionMap(completions), [completions]);
  return useMemo(
    () => tasks.map((t) => toTaskView(t, latestByTask, rooms, members)),
    [tasks, latestByTask, rooms, members],
  );
}

/** Rooms with their pooled tasks and a soft, honest hint. */
export function useRoomViews(): RoomView[] {
  const rooms = useCuraStore((s) => s.rooms);
  const tasks = useCuraStore((s) => s.tasks);
  const completions = useCuraStore((s) => s.completions);
  const members = useCuraStore((s) => s.members);
  const latestByTask = useMemo(() => buildLatestCompletionMap(completions), [completions]);
  return useMemo(
    () => rooms.map((r) => toRoomView(r, tasks, latestByTask, members)),
    [rooms, tasks, latestByTask, members],
  );
}

/** Routines (bundles) with rolling density — never a streak. */
export function useRoutineViews(): RoutineView[] {
  const bundles = useCuraStore((s) => s.bundles);
  const tasks = useCuraStore((s) => s.tasks);
  const completions = useCuraStore((s) => s.completions);
  const members = useCuraStore((s) => s.members);
  const latestByTask = useMemo(() => buildLatestCompletionMap(completions), [completions]);
  return useMemo(
    () => bundles.map((b) => toRoutineView(b, tasks, completions, latestByTask, members)),
    [bundles, tasks, completions, latestByTask, members],
  );
}

/** A single task as a view-model, for edit sheets — never the raw entity. */
export function useTaskView(taskId: string): TaskView | undefined {
  const tasks = useTaskViews();
  return useMemo(() => tasks.find((t) => t.id === taskId), [tasks, taskId]);
}

/** A single room as a view-model, for edit sheets — never the raw entity. */
export function useRoomView(roomId: string): RoomView | undefined {
  const rooms = useRoomViews();
  return useMemo(() => rooms.find((r) => r.id === roomId), [rooms, roomId]);
}

/** A single routine as a view-model, for edit sheets — never the raw entity. */
export function useRoutineView(bundleId: string): RoutineView | undefined {
  const routines = useRoutineViews();
  return useMemo(() => routines.find((b) => b.id === bundleId), [routines, bundleId]);
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
