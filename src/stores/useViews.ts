import { useMemo } from "react";
import { useCuraStore } from "./useCuraStore";
import { buildLatestCompletionMap, groupCompletionsByBundle, toActivityFeed, toRoomView, toRoutineView, toShoppingList, toTaskView } from "../data/selectors";
import { useMinuteTick } from "../app/lib/useMinuteTick";
import type { ActivityView, Member, RoomView, RoutineView, ShoppingListView, TaskView } from "../data/types";

/**
 * The acting user's own Member row, resolved via currentUserId — the "who am
 * I" lookup (`members.find((m) => m.userId === currentUserId)`) that used to
 * be duplicated across 6 feature files (#157). Member has no derived fields
 * (unlike Task/Room), so returning the raw entity here isn't a view-model
 * violation — it's the same entity screens already pass around elsewhere
 * (e.g. HouseholdSheet's member list).
 */
export function useCurrentMember(): Member | undefined {
  const members = useCuraStore((s) => s.members);
  const currentUserId = useCuraStore((s) => s.currentUserId);
  return useMemo(() => members.find((m) => m.userId === currentUserId), [members, currentUserId]);
}

/**
 * Whether this household actually has a housemate — i.e. someone was invited
 * and that invite was accepted, so a second `Member` row exists. Samen is the
 * "zichtbaarheid tussen huisgenoten"-pijler (CLAUDE.md §1): with nobody else in
 * the household it can only ever show your own completions back to you, which
 * reads as a logboek/scorebord of one (§2). So every Samen entry point (Meer's
 * row, Vandaag's preview card, the /samen route itself) hangs off this.
 *
 * Deliberately a plain member count, not "members minus me": when the acting
 * member hasn't resolved yet (unknown userId, mid-init), a household of one
 * must still read as "no housemate" rather than accidentally revealing Samen.
 */
export function useHasHousemate(): boolean {
  return useCuraStore((s) => s.members.length > 1);
}

/** Every task as a view-model — done/dueHint/claimedBy resolved, never stored. */
export function useTaskViews(): TaskView[] {
  const tasks = useCuraStore((s) => s.tasks);
  const completions = useCuraStore((s) => s.completions);
  const rooms = useCuraStore((s) => s.rooms);
  const members = useCuraStore((s) => s.members);
  // Household timezone, not the device's runtime one — otherwise done-state and
  // dueHint can disagree between two housemates' phones, and disagree with the
  // household-timezone-aware push reminders (useTaskReminders).
  const timeZone = useCuraStore((s) => s.households[0]?.timeZone);
  // Re-derive once a minute so a daily task's done-flip at local midnight shows
  // up while the page stays mounted, not only after the next data mutation.
  const tick = useMinuteTick();
  const latestByTask = useMemo(() => buildLatestCompletionMap(completions), [completions]);
  return useMemo(
    () => tasks.map((t) => toTaskView(t, latestByTask, rooms, members, undefined, timeZone)),
    [tasks, latestByTask, rooms, members, timeZone, tick],
  );
}

/** Rooms with their pooled tasks and a soft, honest hint. */
export function useRoomViews(): RoomView[] {
  const rooms = useCuraStore((s) => s.rooms);
  const tasks = useCuraStore((s) => s.tasks);
  const completions = useCuraStore((s) => s.completions);
  const members = useCuraStore((s) => s.members);
  const timeZone = useCuraStore((s) => s.households[0]?.timeZone);
  const tick = useMinuteTick();
  const latestByTask = useMemo(() => buildLatestCompletionMap(completions), [completions]);
  return useMemo(
    () => rooms.map((r) => toRoomView(r, tasks, latestByTask, members, undefined, timeZone)),
    [rooms, tasks, latestByTask, members, timeZone, tick],
  );
}

/** Routines (bundles) with rolling density — never a streak. */
export function useRoutineViews(): RoutineView[] {
  const bundles = useCuraStore((s) => s.bundles);
  const tasks = useCuraStore((s) => s.tasks);
  const completions = useCuraStore((s) => s.completions);
  const members = useCuraStore((s) => s.members);
  const timeZone = useCuraStore((s) => s.households[0]?.timeZone);
  const tick = useMinuteTick();
  const latestByTask = useMemo(() => buildLatestCompletionMap(completions), [completions]);
  // Indexed once per tasks/completions change instead of toRoutineView
  // re-scanning the full completions array once PER bundle (#172).
  const completionsByBundle = useMemo(() => groupCompletionsByBundle(tasks, completions), [tasks, completions]);
  return useMemo(
    () => bundles.map((b) => toRoutineView(b, tasks, completionsByBundle.get(b.id) ?? [], latestByTask, members, undefined, timeZone)),
    [bundles, tasks, completionsByBundle, latestByTask, members, timeZone, tick],
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

/** The shopping list, split into open vs already-checked items and grouped by the household's own categories. */
export function useShoppingList(): ShoppingListView {
  const shoppingItems = useCuraStore((s) => s.shoppingItems);
  const categories = useCuraStore((s) => s.categories);
  return useMemo(() => toShoppingList(shoppingItems, categories), [shoppingItems, categories]);
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
