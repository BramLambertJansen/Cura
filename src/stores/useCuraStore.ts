import { create } from "zustand";
import { toast } from "sonner";
import { createDataStore, type CreateTaskInput, type DataStore } from "../data/store";
import type { Bundle, Household, HouseholdInvite, Member, Room, Task, TaskCompletion } from "../data/types";

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
  householdId: string | null;
  currentUserId: string | null;
  members: Member[];
  households: Household[];
  rooms: Room[];
  tasks: Task[];
  completions: TaskCompletion[];
  bundles: Bundle[];

  init: () => Promise<void>;
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
}

let dataStorePromise: Promise<DataStore> | null = null;
const getDataStore = (): Promise<DataStore> => {
  if (!dataStorePromise) dataStorePromise = createDataStore();
  return dataStorePromise;
};

// Tasks currently mid-toggle — prevents a rapid double-tap from writing two completions.
const toggling = new Set<string>();

export const useCuraStore = create<CuraState>((set, get) => ({
  ready: false,
  householdId: null,
  currentUserId: null,
  members: [],
  households: [],
  rooms: [],
  tasks: [],
  completions: [],
  bundles: [],

  async init() {
    try {
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
      const [members, rooms, tasks, completions, bundles] = await Promise.all([
        store.listMembers(household.id),
        store.listRooms(household.id),
        store.listTasks(household.id),
        store.listCompletions(household.id),
        store.listBundles(household.id),
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
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Laden is niet gelukt");
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
    const userId = await store.currentUserId();
    const result = await store.acceptInvite(token, userId);
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
    set({ ready: false, householdId: null, currentUserId: null, members: [], households: [], rooms: [], tasks: [], completions: [], bundles: [] });
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
        const completion = await store.completeTask(taskId, currentUserId);
        toast.success(`${task.title} gedaan`, { description: "Zichtbaar voor de rest van het huishouden." });
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
        description: input.roomId ? undefined : "Gedeelde pool",
      });
      set({ tasks: [...get().tasks, created] });
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
        await Promise.all(pool.map((t) => store.deleteTask(t.id)));
        const created = await Promise.all(
          toCreate.map((draft) =>
            store.createTask(householdId, {
              title: draft.title, bundleId, intervalDays: newIntervalDays,
              durationMin: draft.durationMin, description: draft.description,
            }),
          ),
        );
        // Update kept tasks whose cadence, duration, or description changed.
        const kept = await Promise.all(
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
        tasks = [...tasks.filter((t) => t.bundleId !== bundleId), ...kept, ...created];
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
}));
