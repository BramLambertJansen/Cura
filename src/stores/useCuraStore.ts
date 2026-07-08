import { create } from "zustand";
import { toast } from "sonner";
import { createDataStore, type CreateTaskInput, type CreateShoppingItemInput, type DataStore, type PushSubscriptionInput } from "../data/store";
import type { Bundle, Household, HouseholdInvite, Member, Room, Task, TaskCompletion, ShoppingItem } from "../data/types";

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
  createInvite: () => Promise<HouseholdInvite | undefined>;
  acceptInvite: (token: string) => Promise<AcceptInviteResult>;
  revokeInvite: (token: string) => Promise<void>;

  reset: () => void;
  toggleTask: (taskId: string, done: boolean) => Promise<void>;
  claimTask: (taskId: string, claimed: boolean) => Promise<void>;
  createTask: (input: CreateTaskInput) => Promise<void>;
  createTasksFromTemplates: (roomId: string, templates: Omit<CreateTaskInput, "roomId">[]) => Promise<void>;
  updateTask: (taskId: string, patch: Partial<CreateTaskInput>) => Promise<void>;
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

// Tasks currently mid-toggle — prevents a rapid double-tap from writing two completions.
const toggling = new Set<string>();

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
        store.listCompletions(household.id),
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
        store.listCompletions(householdId),
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
    try {
      const store = await getDataStore();
      const { householdId } = get();
      if (!householdId) return;
      const updated = await store.updateHousehold(householdId, name);
      toast("Naam opgeslagen");
      set({ households: get().households.map((h) => (h.id === householdId ? updated : h)) });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Opslaan lukte niet");
    }
  },

  async updateMember(displayName) {
    try {
      const store = await getDataStore();
      const me = get().members.find((m) => m.userId === get().currentUserId);
      if (!me) return;
      const updated = await store.updateMember(me.id, { displayName });
      toast("Naam opgeslagen");
      set({ members: get().members.map((m) => (m.id === me.id ? updated : m)) });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Opslaan lukte niet");
    }
  },

  async createInvite() {
    const store = await getDataStore();
    const { householdId } = get();
    if (!householdId) return undefined;
    try {
      return await store.createInvite(householdId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Uitnodigen lukte niet");
      return undefined;
    }
  },

  async acceptInvite(token) {
    const store = await getDataStore();
    const result = await store.acceptInvite(token);
    if (result.ok) await get().init();
    return result;
  },

  async revokeInvite(token) {
    try {
      const store = await getDataStore();
      await store.revokeInvite(token);
      toast("Link ingetrokken");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Intrekken lukte niet");
    }
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
        toast.success("Lekker bezig", { description: `${task.title} is gedaan — zichtbaar voor het huishouden.` });
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
    try {
      const store = await getDataStore();
      const { currentUserId, tasks } = get();
      if (!currentUserId) return;
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;
      const updated = await store.claimTask(taskId, claimed ? currentUserId : null);
      if (claimed) toast(`Jij pakt "${task.title}"`, { description: "Anderen zien dat jij dit doet." });
      else toast(`"${task.title}" vrijgegeven`);
      set({ tasks: get().tasks.map((t) => (t.id === taskId ? updated : t)) });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Claimen lukte niet");
    }
  },

  async createTask(input) {
    try {
      const store = await getDataStore();
      const { householdId } = get();
      if (!householdId) return;
      const created = await store.createTask(householdId, input);
      toast.success(`"${created.title}" toegevoegd`, {
        description: input.planned ? "Op je dag gezet" : input.roomId ? undefined : "Gedeelde pool",
      });
      set({ tasks: [...get().tasks, created] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Toevoegen lukte niet");
    }
  },

  async createTasksFromTemplates(roomId, templates) {
    try {
      const store = await getDataStore();
      const { householdId } = get();
      if (!householdId) return;
      const created = await Promise.all(
        templates.map((t) => store.createTask(householdId, { ...t, roomId })),
      );
      toast.success(created.length === 1 ? `"${created[0].title}" toegevoegd` : `${created.length} taken toegevoegd`);
      set({ tasks: [...get().tasks, ...created] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Toevoegen lukte niet");
    }
  },

  async updateTask(taskId, patch) {
    try {
      const store = await getDataStore();
      const updated = await store.updateTask(taskId, patch);
      set({ tasks: get().tasks.map((t) => (t.id === taskId ? updated : t)) });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Bijwerken lukte niet");
    }
  },

  async deleteTask(taskId) {
    try {
      const store = await getDataStore();
      await store.deleteTask(taskId);
      set({
        tasks: get().tasks.filter((t) => t.id !== taskId),
        completions: get().completions.filter((c) => c.taskId !== taskId),
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Verwijderen lukte niet");
    }
  },

  async createRoom(room) {
    try {
      const store = await getDataStore();
      const { householdId } = get();
      if (!householdId) return;
      const created = await store.createRoom(householdId, room);
      toast.success(`"${created.name}" toegevoegd`);
      set({ rooms: [...get().rooms, created] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Toevoegen lukte niet");
    }
  },

  async updateRoom(roomId, patch) {
    try {
      const store = await getDataStore();
      const updated = await store.updateRoom(roomId, patch);
      toast("Kamer bijgewerkt");
      set({ rooms: get().rooms.map((r) => (r.id === roomId ? updated : r)) });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Bijwerken lukte niet");
    }
  },

  async deleteRoom(roomId) {
    try {
      const store = await getDataStore();
      await store.deleteRoom(roomId);
      toast("Kamer verwijderd");
      set({ rooms: get().rooms.filter((r) => r.id !== roomId) });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Verwijderen lukte niet");
    }
  },

  async createBundle(bundle, taskDrafts) {
    try {
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
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Aanmaken lukte niet");
    }
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
    try {
      const store = await getDataStore();
      await store.deleteBundle(bundleId);
      toast("Routine verwijderd");
      set({
        bundles: get().bundles.filter((b) => b.id !== bundleId),
        tasks: get().tasks.filter((t) => t.bundleId !== bundleId),
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Verwijderen lukte niet");
    }
  },

  async createShoppingItem(input) {
    try {
      const store = await getDataStore();
      const { householdId } = get();
      if (!householdId) return;
      const created = await store.createShoppingItem(householdId, input);
      set({ shoppingItems: [...get().shoppingItems, created] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Toevoegen lukte niet");
    }
  },

  async toggleShoppingItem(itemId, checked) {
    try {
      const store = await getDataStore();
      const updated = await store.toggleShoppingItem(itemId, checked);
      set({ shoppingItems: get().shoppingItems.map((i) => (i.id === itemId ? updated : i)) });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Afvinken lukte niet");
    }
  },

  async deleteShoppingItem(itemId) {
    try {
      const store = await getDataStore();
      await store.deleteShoppingItem(itemId);
      set({ shoppingItems: get().shoppingItems.filter((i) => i.id !== itemId) });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Verwijderen lukte niet");
    }
  },

  async clearCheckedShoppingItems() {
    try {
      const store = await getDataStore();
      const toRemove = get().shoppingItems.filter((i) => i.checked);
      const results = await Promise.allSettled(toRemove.map((i) => store.deleteShoppingItem(i.id)));
      const removedIds = new Set(toRemove.filter((_, idx) => results[idx].status === "fulfilled").map((i) => i.id));
      set({ shoppingItems: get().shoppingItems.filter((i) => !removedIds.has(i.id)) });
      toast("Afgevinkte items gewist");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Wissen lukte niet");
    }
  },

  async clearShoppingList() {
    try {
      const store = await getDataStore();
      const toRemove = get().shoppingItems;
      const results = await Promise.allSettled(toRemove.map((i) => store.deleteShoppingItem(i.id)));
      const removedIds = new Set(toRemove.filter((_, idx) => results[idx].status === "fulfilled").map((i) => i.id));
      set({ shoppingItems: get().shoppingItems.filter((i) => !removedIds.has(i.id)) });
      toast("Boodschappenlijst geleegd");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Legen lukte niet");
    }
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
