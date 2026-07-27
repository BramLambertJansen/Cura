import { create } from "zustand";
import { toast } from "sonner";
import { createDataStore, type CreateTaskInput, type CreateShoppingItemInput, type DataStore, type PushSubscriptionInput, type UpdateShoppingItemInput } from "../data/store";
import type { Bundle, Household, HouseholdInvite, Member, Room, Task, TaskCompletion, ShoppingItem } from "../data/types";
import { MAX_TASK_INTERVAL_DAYS } from "../data/selectors";

type AcceptInviteResult = { ok: true } | { ok: false; reason: "already_member" | "invalid" | "expired" };

/** A routine-taak zoals ingevoerd in NewRoutineSheet/EditRoutineSheet, vóór opslaan. */
export interface TaakDraft {
  title: string;
  durationMin?: number;
  description?: string;
}

/**
 * Zustand store — the one place feature code touches to read/write data.
 * It owns a DataStore instance (mode resolved by VITE_DATA_MODE, CLAUDE.md §4)
 * and holds the normalized domain entities in memory, refreshed after every
 * write. Screens never import the DataStore or localStorage directly; they
 * read view-models derived from this state via src/data/selectors.ts.
 */

interface CuraState {
  ready: boolean;
  /** Set when the initial load fails, so the Gate can offer a calm retry instead of an endless skeleton. */
  initError: string | null;
  householdId: string | null;
  currentUserId: string | null;
  members: Member[];
  households: Household[];
  rooms: Room[];
  tasks: Task[];
  completions: TaskCompletion[];
  bundles: Bundle[];
  shoppingItems: ShoppingItem[];

  init: () => Promise<void>;
  /** Re-fetch all lists for the current household (pull-to-refresh, realtime). Resolves silently on failure — a missed refresh isn't worth an alarm. */
  refresh: () => Promise<void>;
  createHousehold: (name: string) => Promise<void>;
  updateHousehold: (name: string) => Promise<void>;
  updateMember: (displayName: string) => Promise<void>;
  /** Sets or clears the acting member's quiet hours. Pass null/null to turn them off. */
  updateQuietHours: (start: string | null, end: string | null) => Promise<void>;
  createInvite: () => Promise<HouseholdInvite | undefined>;
  acceptInvite: (token: string) => Promise<AcceptInviteResult>;
  revokeInvite: (token: string) => Promise<void>;

  reset: () => void;
  toggleTask: (taskId: string, done: boolean) => Promise<void>;
  claimTask: (taskId: string, claimed: boolean) => Promise<void>;
  /** "Wie pakt dit op?" — assign to any household member by their member id (or null for "Niemand"), not just the acting user. */
  assignTask: (taskId: string, memberId: string | null) => Promise<void>;
  createTask: (input: CreateTaskInput) => Promise<void>;
  createTasksFromTemplates: (roomId: string | undefined, templates: Omit<CreateTaskInput, "roomId">[]) => Promise<void>;
  /** Resolves `true` on success, `false` on failure (already toasted) — check it before assuming the patch landed. */
  updateTask: (taskId: string, patch: Partial<CreateTaskInput>) => Promise<boolean>;
  deleteTask: (taskId: string) => Promise<void>;

  createRoom: (room: Omit<Room, "id" | "householdId">) => Promise<void>;
  updateRoom: (roomId: string, patch: Partial<Omit<Room, "id" | "householdId">>) => Promise<void>;
  deleteRoom: (roomId: string) => Promise<void>;

  createBundle: (
    bundle: Omit<Bundle, "id" | "householdId">,
    taskDrafts: TaakDraft[],
  ) => Promise<void>;
  updateBundle: (
    bundleId: string,
    patch: Partial<Omit<Bundle, "id" | "householdId">>,
    taskDrafts?: TaakDraft[],
  ) => Promise<void>;
  deleteBundle: (bundleId: string) => Promise<void>;

  createShoppingItem: (input: CreateShoppingItemInput) => Promise<void>;
  updateShoppingItem: (itemId: string, patch: UpdateShoppingItemInput) => Promise<void>;
  toggleShoppingItem: (itemId: string, checked: boolean) => Promise<void>;
  deleteShoppingItem: (itemId: string) => Promise<void>;
  /** Removes only the checked items — a "declutter" pass, keeps what's still needed. */
  clearCheckedShoppingItems: () => Promise<void>;
  /** Removes every item — "start fresh" after a full shopping trip. */
  clearShoppingList: () => Promise<void>;

  /**
   * Register/unregister this browser's Web Push subscription for the current
   * household + user. Unlike the other actions these let errors propagate (no
   * toast here) — the caller (ProfielSheet's meldingen-toggle) owns the
   * interactive success/failure feedback. No-ops in local mode.
   */
  savePushSubscription: (sub: PushSubscriptionInput) => Promise<void>;
  deletePushSubscription: (endpoint: string) => Promise<void>;
}

let dataStorePromise: Promise<DataStore> | null = null;
const getDataStore = (): Promise<DataStore> => {
  if (!dataStorePromise) dataStorePromise = createDataStore();
  return dataStorePromise;
};

/**
 * Most actions share one shape: do the work, toast a fallback message if it
 * throws (#155 — this used to be copy-pasted ~20 times). Resolves to
 * `undefined` on failure, so an action that returns a value (createInvite)
 * still gets a usable result instead of a rethrown error.
 *
 * A handful of actions keep their own try/catch instead of forcing a
 * different shape through this: toggleTask (double-tap guard + finally),
 * assignTask (stale-response guard), updateBundle (its own success/partial-
 * failure toast), updateTask (true/false contract, not undefined), and
 * init/refresh (their own distinct failure handling).
 */
async function withToastOnError<T>(action: () => Promise<T>, fallbackMessage: string): Promise<T | undefined> {
  try {
    return await action();
  } catch (e) {
    toast.error(e instanceof Error ? e.message : fallbackMessage);
    return undefined;
  }
}

// Bounding the completions fetch instead of loading a household's entire
// lifetime history on every init()/refresh() (#154). isDone/dueHint only ever
// need a task's LATEST completion, and MAX_TASK_INTERVAL_DAYS is the longest
// a task's own interval can be (IntervalKiezer's input clamp) — so nothing
// legitimately recurring can have its most recent completion fall outside
// this window while still reading as "done". The Samen activity feed asks for
// far less than this (today only, via its own sinceIso), so one shared bound
// comfortably covers every current consumer of `completions`.
const COMPLETIONS_LOOKBACK_MS = MAX_TASK_INTERVAL_DAYS * 24 * 60 * 60 * 1000;
const completionsSince = (): string => new Date(Date.now() - COMPLETIONS_LOOKBACK_MS).toISOString();

// Tasks currently mid-toggle — prevents a rapid double-tap from writing two completions.
const toggling = new Set<string>();

// Per-task assignTask call counter — unlike `toggling` above, rapid re-assigns
// are a legitimate change of mind (tap "Jij", then quickly tap a housemate
// instead), not a double-tap to ignore. Each call claims the next number, and
// only the response matching the LATEST number for that task gets applied —
// an earlier call resolving late (out of network-timing order) can no longer
// overwrite a more recent selection.
const assignSeq = new Map<string, number>();

// Realtime (Phase 3+, cloud mode only — a no-op subscription in local mode).
// A burst of remote postgres_changes events collapses into one refetch instead
// of one per row (someone completing several tasks shouldn't fire N refetches).
const REALTIME_DEBOUNCE_MS = 400;
let unsubscribeRealtime: (() => void) | null = null;
let realtimeRefreshTimer: ReturnType<typeof setTimeout> | null = null;

export const useCuraStore = create<CuraState>((set, get) => ({
  ready: false,
  initError: null,
  householdId: null,
  currentUserId: null,
  members: [],
  households: [],
  rooms: [],
  tasks: [],
  completions: [],
  bundles: [],
  shoppingItems: [],

  async init() {
    try {
      set({ initError: null });
      const store = await getDataStore();
      const userId = await store.currentUserId();
      const households = await store.getHouseholdsForUser(userId);
      const household = households[0];
      if (!household) {
        // Degrade gracefully rather than crash — there's always exactly one
        // implicit household in local mode (seeded on first run).
        set({ ready: true, currentUserId: userId, households: [] });
        return;
      }
      const [members, rooms, tasks, completions, bundles, shoppingItems] = await Promise.all([
        store.listMembers(household.id),
        store.listRooms(household.id),
        store.listTasks(household.id),
        store.listCompletions(household.id, completionsSince()),
        store.listBundles(household.id),
        store.listShoppingItems(household.id),
      ]);
      set({
        ready: true,
        householdId: household.id,
        currentUserId: userId,
        households,
        members,
        rooms,
        tasks,
        completions,
        bundles,
        shoppingItems,
      });

      // Re-init (e.g. after accepting an invite) replaces any earlier subscription.
      unsubscribeRealtime?.();
      unsubscribeRealtime = store.subscribeToChanges(household.id, () => {
        if (realtimeRefreshTimer) clearTimeout(realtimeRefreshTimer);
        realtimeRefreshTimer = setTimeout(() => {
          // Guard against a change from a household we've since left (reset()/re-init raced this timer).
          if (get().householdId !== household.id) return;
          void get().refresh();
        }, REALTIME_DEBOUNCE_MS);
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Laden is niet gelukt";
      toast.error(message);
      // Surface a retryable error instead of leaving the Gate on an endless skeleton.
      set({ initError: message });
    }
  },

  async refresh() {
    try {
      const store = await getDataStore();
      const { householdId } = get();
      if (!householdId) return;
      const [members, rooms, tasks, completions, bundles, shoppingItems] = await Promise.all([
        store.listMembers(householdId),
        store.listRooms(householdId),
        store.listTasks(householdId),
        store.listCompletions(householdId, completionsSince()),
        store.listBundles(householdId),
        store.listShoppingItems(householdId),
      ]);
      // Household changed while the fetch was in flight (sign-out/re-init) — discard.
      if (get().householdId !== householdId) return;
      set({ members, rooms, tasks, completions, bundles, shoppingItems });
    } catch {
      // Silent — a transient refresh failure isn't worth interrupting the session over; the next refresh retries.
    }
  },

  async createHousehold(name) {
    const store = await getDataStore();
    await store.createHousehold(name);
    await get().init();
  },

  async updateHousehold(name) {
    return withToastOnError(async () => {
      const store = await getDataStore();
      const { householdId } = get();
      if (!householdId) return;
      const updated = await store.updateHousehold(householdId, name);
      toast("Naam opgeslagen");
      set({ households: get().households.map((h) => (h.id === householdId ? updated : h)) });
    }, "Opslaan lukte niet");
  },

  async updateMember(displayName) {
    return withToastOnError(async () => {
      const store = await getDataStore();
      const me = get().members.find((m) => m.userId === get().currentUserId);
      if (!me) return;
      const updated = await store.updateMember(me.id, { displayName });
      toast("Naam opgeslagen");
      set({ members: get().members.map((m) => (m.id === me.id ? updated : m)) });
    }, "Opslaan lukte niet");
  },

  async updateQuietHours(start, end) {
    return withToastOnError(async () => {
      const store = await getDataStore();
      const me = get().members.find((m) => m.userId === get().currentUserId);
      if (!me) return;
      const updated = await store.updateMember(me.id, { quietHoursStart: start, quietHoursEnd: end });
      toast(start && end ? "Stille uren ingesteld" : "Stille uren uit");
      set({ members: get().members.map((m) => (m.id === me.id ? updated : m)) });
    }, "Opslaan lukte niet");
  },

  async createInvite() {
    const store = await getDataStore();
    const { householdId } = get();
    if (!householdId) return undefined;
    return withToastOnError(() => store.createInvite(householdId), "Uitnodigen lukte niet");
  },

  async acceptInvite(token) {
    const store = await getDataStore();
    const result = await store.acceptInvite(token);
    if (result.ok) await get().init();
    return result;
  },

  async revokeInvite(token) {
    return withToastOnError(async () => {
      const store = await getDataStore();
      await store.revokeInvite(token);
      toast("Link ingetrokken");
    }, "Intrekken lukte niet");
  },

  reset() {
    unsubscribeRealtime?.();
    unsubscribeRealtime = null;
    if (realtimeRefreshTimer) {
      clearTimeout(realtimeRefreshTimer);
      realtimeRefreshTimer = null;
    }
    set({ ready: false, initError: null, householdId: null, currentUserId: null, members: [], households: [], rooms: [], tasks: [], completions: [], bundles: [], shoppingItems: [] });
    dataStorePromise = null;
  },

  async toggleTask(taskId, done) {
    if (toggling.has(taskId)) return;
    toggling.add(taskId);
    try {
      const store = await getDataStore();
      const { currentUserId, tasks, completions } = get();
      if (!currentUserId) return;
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;
      if (done) {
        // Soft haptic tick + a single warm confirmation — this is the one place a
        // completion toasts, so screens don't fire their own on top of it.
        if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(8);
        const completion = await store.completeTask(taskId, currentUserId);
        toast.success("Lekker bezig", {
          description: `${task.title} is gedaan — zichtbaar voor het huishouden.`,
          // Vergevingsgezind: zet een per ongeluk (swipe-)afvink met één tik terug,
          // net als de "Even niet vandaag"-dismissals. Hergebruikt het uncomplete-pad.
          action: { label: "Ongedaan maken", onClick: () => { void get().toggleTask(taskId, false); } },
        });
        set({ completions: [...get().completions, completion] });
      } else {
        // Mirrors uncompleteTask's own "remove the most recent one" rule, so we
        // know which row disappeared without refetching the whole history.
        const latest = completions
          .filter((c) => c.taskId === taskId)
          .sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0];
        await store.uncompleteTask(taskId);
        toast(`${task.title} terug op de lijst`);
        if (latest) set({ completions: get().completions.filter((c) => c.id !== latest.id) });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Afvinken lukte niet");
    } finally {
      toggling.delete(taskId);
    }
  },

  async claimTask(taskId, claimed) {
    return withToastOnError(async () => {
      const store = await getDataStore();
      const { currentUserId, tasks } = get();
      if (!currentUserId) return;
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;
      // trackPickup: true — this action is exclusively Huis's pool-claim/"Laat
      // los" flow (HuisPage/RoomDetailPage, via useHuisTaskActions), never the
      // generic planned-auto-claim below, so it's the one true "picked up from
      // Huis" signal for Vandaag.
      const updated = await store.claimTask(taskId, claimed ? currentUserId : null, true);
      if (claimed) toast(`Jij pakt "${task.title}"`, { description: "Anderen zien dat jij dit doet." });
      else toast(`"${task.title}" vrijgegeven`);
      set({ tasks: get().tasks.map((t) => (t.id === taskId ? updated : t)) });
    }, "Claimen lukte niet");
  },

  async assignTask(taskId, memberId) {
    const seq = (assignSeq.get(taskId) ?? 0) + 1;
    assignSeq.set(taskId, seq);
    try {
      const store = await getDataStore();
      const { tasks, members, currentUserId } = get();
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;
      if (memberId && !members.some((m) => m.id === memberId)) {
        throw new Error("Dit huisgenootschap kent dit lid niet.");
      }
      const updated = await store.assignTask(taskId, memberId);
      if (assignSeq.get(taskId) !== seq) return; // a newer assign call already superseded this one
      if (memberId) {
        const me = members.find((m) => m.userId === currentUserId);
        const name = memberId === me?.id ? "Jij" : members.find((m) => m.id === memberId)?.displayName ?? "Iemand";
        toast(`${name} pakt "${task.title}"`, { description: name === "Jij" ? "Anderen zien dat jij dit doet." : undefined });
      } else {
        toast(`"${task.title}" vrijgegeven`);
      }
      set({ tasks: get().tasks.map((t) => (t.id === taskId ? updated : t)) });
    } catch (e) {
      if (assignSeq.get(taskId) !== seq) return;
      toast.error(e instanceof Error ? e.message : "Toewijzen lukte niet");
    }
  },

  async createTask(input) {
    return withToastOnError(async () => {
      const store = await getDataStore();
      const { householdId, currentUserId } = get();
      if (!householdId) return;
      // Creating a task with an already-checked checklist item is itself a
      // soft "I've started this" signal — same spirit as the planned
      // auto-claim below. This is the only place this rule is evaluated (see
      // updateTask for the edit-time equivalent), so it's never duplicated
      // per call-site.
      const hasCheckedItem = input.checklistItems?.some((i) => i.checked) ?? false;
      const finalInput = hasCheckedItem && !input.startedAt
        ? { ...input, startedAt: new Date().toISOString() }
        : input;
      let created = await store.createTask(householdId, finalInput);
      // Putting a task on your day is itself a soft "ik doe dit" — claim it for
      // free instead of requiring a second explicit "ik pak dit" action.
      if (input.planned && currentUserId) {
        created = await store.claimTask(created.id, currentUserId);
      }
      toast.success(`"${created.title}" toegevoegd`, {
        description: input.planned ? "Op je dag gezet" : input.roomId ? undefined : "Gedeelde pool",
      });
      set({ tasks: [...get().tasks, created] });
    }, "Toevoegen lukte niet");
  },

  async createTasksFromTemplates(roomId, templates) {
    return withToastOnError(async () => {
      const store = await getDataStore();
      const { householdId, currentUserId } = get();
      if (!householdId) return;
      const created = await Promise.all(
        templates.map(async (t) => {
          let task = await store.createTask(householdId, { ...t, roomId });
          // Same soft "ik doe dit" auto-claim as createTask — planned:true starter
          // tasks (CreateHouseholdPage) shouldn't land unclaimed in the pool.
          if (t.planned && currentUserId) task = await store.claimTask(task.id, currentUserId);
          return task;
        }),
      );
      toast.success(created.length === 1 ? `"${created[0].title}" toegevoegd` : `${created.length} taken toegevoegd`);
      set({ tasks: [...get().tasks, ...created] });
    }, "Toevoegen lukte niet");
  },

  async updateTask(taskId, patch) {
    try {
      const store = await getDataStore();
      const { currentUserId, tasks } = get();
      const existing = tasks.find((t) => t.id === taskId);
      const wasPlanned = existing?.planned ?? false;
      // Same rule as createTask above, for the edit-time transition: checking
      // a checklist item auto-sets startedAt IF the task wasn't already
      // started before this save AND the caller didn't already send an
      // explicit startedAt (never overrides a manual "Gestart" value set in
      // the same save, and never re-fires once startedAt already exists).
      const hasCheckedItem = patch.checklistItems?.some((i) => i.checked) ?? false;
      const alreadyStarted = !!existing?.startedAt;
      const finalPatch = hasCheckedItem && !alreadyStarted && !patch.startedAt
        ? { ...patch, startedAt: new Date().toISOString() }
        : patch;
      let updated = await store.updateTask(taskId, finalPatch);
      // Same soft auto-claim as createTask, but only on the transition into
      // `planned` (not every re-save of an already-planned task), and only if
      // nobody else already claimed it — never silently override an existing claim.
      if (patch.planned && !wasPlanned && currentUserId && !updated.claimedById) {
        updated = await store.claimTask(taskId, currentUserId);
      }
      set({ tasks: get().tasks.map((t) => (t.id === taskId ? updated : t)) });
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Bijwerken lukte niet");
      return false;
    }
  },

  async deleteTask(taskId) {
    return withToastOnError(async () => {
      const store = await getDataStore();
      await store.deleteTask(taskId);
      set({
        tasks: get().tasks.filter((t) => t.id !== taskId),
        completions: get().completions.filter((c) => c.taskId !== taskId),
      });
    }, "Verwijderen lukte niet");
  },

  async createRoom(room) {
    return withToastOnError(async () => {
      const store = await getDataStore();
      const { householdId } = get();
      if (!householdId) return;
      const created = await store.createRoom(householdId, room);
      toast.success(`"${created.name}" toegevoegd`);
      set({ rooms: [...get().rooms, created] });
    }, "Toevoegen lukte niet");
  },

  async updateRoom(roomId, patch) {
    return withToastOnError(async () => {
      const store = await getDataStore();
      const updated = await store.updateRoom(roomId, patch);
      toast("Kamer bijgewerkt");
      set({ rooms: get().rooms.map((r) => (r.id === roomId ? updated : r)) });
    }, "Bijwerken lukte niet");
  },

  async deleteRoom(roomId) {
    return withToastOnError(async () => {
      const store = await getDataStore();
      await store.deleteRoom(roomId);
      toast("Kamer verwijderd");
      set({ rooms: get().rooms.filter((r) => r.id !== roomId) });
    }, "Verwijderen lukte niet");
  },

  async createBundle(bundle, taskDrafts) {
    return withToastOnError(async () => {
      const store = await getDataStore();
      const { householdId } = get();
      if (!householdId) return;
      const created = await store.createBundle(householdId, bundle);
      const createdTasks = await Promise.all(
        taskDrafts
          .filter((draft) => draft.title.trim())
          .map((draft) =>
            store.createTask(householdId, {
              title: draft.title.trim(),
              durationMin: draft.durationMin,
              description: draft.description,
              bundleId: created.id,
              intervalDays: bundle.cadence === "daily" ? 1 : 7,
            }),
          ),
      );
      toast.success(`"${created.name}" aangemaakt`);
      set({ bundles: [...get().bundles, created], tasks: [...get().tasks, ...createdTasks] });
    }, "Aanmaken lukte niet");
  },

  async updateBundle(bundleId, patch, taskDrafts) {
    try {
      const store = await getDataStore();
      const { householdId } = get();
      if (!householdId) return;
      const updated = await store.updateBundle(bundleId, patch);
      let { tasks } = get();
      if (taskDrafts !== undefined) {
        const newIntervalDays = updated.cadence === "daily" ? 1 : 7;
        // Diff the task list to preserve completions for unchanged tasks.
        // Greedy title-match: for each new title consume one existing task with
        // that exact title. Unmatched existing tasks are deleted (losing their
        // completions, which is correct — the user removed them). Unmatched new
        // titles are created fresh.
        const existing = tasks.filter((t) => t.bundleId === bundleId);
        const pool = [...existing];
        const toKeep: { task: Task; draft: TaakDraft }[] = [];
        const toCreate: TaakDraft[] = [];
        for (const rawDraft of taskDrafts) {
          const title = rawDraft.title.trim();
          if (!title) continue;
          const draft = { ...rawDraft, title };
          const idx = pool.findIndex((t) => t.title === title);
          if (idx !== -1) {
            toKeep.push({ task: pool[idx], draft });
            pool.splice(idx, 1);
          } else {
            toCreate.push(draft);
          }
        }
        // pool = tasks no longer in the list — delete (cascades their completions).
        // allSettled, not all: one rejection shouldn't hide which of the other
        // deletes/creates/updates in the batch actually landed on the backend.
        const deleteResults = await Promise.allSettled(pool.map((t) => store.deleteTask(t.id)));
        const deletedIds = new Set(pool.filter((_, i) => deleteResults[i].status === "fulfilled").map((t) => t.id));
        const createResults = await Promise.allSettled(
          toCreate.map((draft) =>
            store.createTask(householdId, {
              title: draft.title, bundleId, intervalDays: newIntervalDays,
              durationMin: draft.durationMin, description: draft.description,
            }),
          ),
        );
        const created = createResults.filter((r) => r.status === "fulfilled").map((r) => r.value);
        // Update kept tasks whose cadence, duration, or description changed.
        const keptResults = await Promise.allSettled(
          toKeep.map(({ task, draft }) => {
            const changedPatch: Partial<CreateTaskInput> = {};
            if (task.intervalDays !== newIntervalDays) changedPatch.intervalDays = newIntervalDays;
            if (task.durationMin !== draft.durationMin) changedPatch.durationMin = draft.durationMin;
            if (task.description !== draft.description) changedPatch.description = draft.description;
            return Object.keys(changedPatch).length > 0
              ? store.updateTask(task.id, changedPatch)
              : Promise.resolve(task);
          }),
        );
        const kept = toKeep.map(({ task }, i) => {
          const r = keptResults[i];
          return r.status === "fulfilled" ? r.value : task;
        });
        // Tasks whose delete/create/update rejected keep their last-known state
        // instead of vanishing, so local state can't drift further from the backend
        // than the failed call already caused.
        tasks = [
          ...tasks.filter((t) => t.bundleId !== bundleId),
          ...pool.filter((t) => !deletedIds.has(t.id)),
          ...kept,
          ...created,
        ];
        const anyFailed = [...deleteResults, ...createResults, ...keptResults].some((r) => r.status === "rejected");
        set({ bundles: get().bundles.map((b) => (b.id === bundleId ? updated : b)), tasks });
        toast[anyFailed ? "error" : "success"](anyFailed ? "Routine deels bijgewerkt — niet alles is gelukt" : "Routine bijgewerkt");
        return;
      }
      toast("Routine bijgewerkt");
      set({ bundles: get().bundles.map((b) => (b.id === bundleId ? updated : b)), tasks });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Bijwerken lukte niet");
    }
  },

  async deleteBundle(bundleId) {
    return withToastOnError(async () => {
      const store = await getDataStore();
      await store.deleteBundle(bundleId);
      toast("Routine verwijderd");
      set({
        bundles: get().bundles.filter((b) => b.id !== bundleId),
        tasks: get().tasks.filter((t) => t.bundleId !== bundleId),
      });
    }, "Verwijderen lukte niet");
  },

  async createShoppingItem(input) {
    return withToastOnError(async () => {
      const store = await getDataStore();
      const { householdId } = get();
      if (!householdId) return;
      const created = await store.createShoppingItem(householdId, input);
      set({ shoppingItems: [...get().shoppingItems, created] });
    }, "Toevoegen lukte niet");
  },

  async updateShoppingItem(itemId, patch) {
    return withToastOnError(async () => {
      const store = await getDataStore();
      const updated = await store.updateShoppingItem(itemId, patch);
      set({ shoppingItems: get().shoppingItems.map((i) => (i.id === itemId ? updated : i)) });
    }, "Bijwerken lukte niet");
  },

  async toggleShoppingItem(itemId, checked) {
    return withToastOnError(async () => {
      const store = await getDataStore();
      const updated = await store.toggleShoppingItem(itemId, checked);
      set({ shoppingItems: get().shoppingItems.map((i) => (i.id === itemId ? updated : i)) });
    }, "Afvinken lukte niet");
  },

  async deleteShoppingItem(itemId) {
    return withToastOnError(async () => {
      const store = await getDataStore();
      await store.deleteShoppingItem(itemId);
      set({ shoppingItems: get().shoppingItems.filter((i) => i.id !== itemId) });
    }, "Verwijderen lukte niet");
  },

  async clearCheckedShoppingItems() {
    return withToastOnError(async () => {
      const store = await getDataStore();
      const toRemove = get().shoppingItems.filter((i) => i.checked);
      const results = await Promise.allSettled(toRemove.map((i) => store.deleteShoppingItem(i.id)));
      const removedIds = new Set(toRemove.filter((_, idx) => results[idx].status === "fulfilled").map((i) => i.id));
      set({ shoppingItems: get().shoppingItems.filter((i) => !removedIds.has(i.id)) });
      toast("Afgevinkte items gewist");
    }, "Wissen lukte niet");
  },

  async clearShoppingList() {
    return withToastOnError(async () => {
      const store = await getDataStore();
      const toRemove = get().shoppingItems;
      const results = await Promise.allSettled(toRemove.map((i) => store.deleteShoppingItem(i.id)));
      const removedIds = new Set(toRemove.filter((_, idx) => results[idx].status === "fulfilled").map((i) => i.id));
      set({ shoppingItems: get().shoppingItems.filter((i) => !removedIds.has(i.id)) });
      toast("Boodschappenlijst geleegd");
    }, "Legen lukte niet");
  },

  async savePushSubscription(sub) {
    const store = await getDataStore();
    const { householdId, currentUserId } = get();
    if (!householdId || !currentUserId) return;
    await store.savePushSubscription(householdId, currentUserId, sub);
  },

  async deletePushSubscription(endpoint) {
    const store = await getDataStore();
    await store.deletePushSubscription(endpoint);
  },
}));
