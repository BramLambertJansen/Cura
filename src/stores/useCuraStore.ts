import { create } from "zustand";
import { toast } from "sonner";
import { createDataStore, type CreateTaskInput, type DataStore } from "../data/store";
import type { Bundle, Household, Member, Room, Task, TaskCompletion } from "../data/types";

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

  toggleTask: (taskId: string, done: boolean) => Promise<void>;
  claimTask: (taskId: string, claimed: boolean) => Promise<void>;
  createTask: (input: CreateTaskInput) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;

  createRoom: (room: Omit<Room, "id" | "householdId">) => Promise<void>;
  updateRoom: (roomId: string, patch: Partial<Omit<Room, "id" | "householdId">>) => Promise<void>;
  deleteRoom: (roomId: string) => Promise<void>;

  createBundle: (
    bundle: Omit<Bundle, "id" | "householdId">,
    taskTitles: string[],
  ) => Promise<void>;
  updateBundle: (
    bundleId: string,
    patch: Partial<Omit<Bundle, "id" | "householdId">>,
    taskTitles?: string[],
  ) => Promise<void>;
  deleteBundle: (bundleId: string) => Promise<void>;
}

let dataStorePromise: Promise<DataStore> | null = null;
const getDataStore = (): Promise<DataStore> => {
  if (!dataStorePromise) dataStorePromise = createDataStore();
  return dataStorePromise;
};

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
  },

  async toggleTask(taskId, done) {
    const store = await getDataStore();
    const { currentUserId, tasks } = get();
    if (!currentUserId) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    if (done) {
      await store.completeTask(taskId, currentUserId);
      toast.success(`${task.title} gedaan`, { description: "Zichtbaar voor de rest van het huishouden." });
    } else {
      await store.uncompleteTask(taskId);
      toast(`${task.title} terug op de lijst`);
    }
    const { householdId } = get();
    if (householdId) set({ completions: await store.listCompletions(householdId) });
  },

  async claimTask(taskId, claimed) {
    const store = await getDataStore();
    const { currentUserId, tasks } = get();
    if (!currentUserId) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const updated = await store.claimTask(taskId, claimed ? currentUserId : null);
    if (claimed) toast(`Jij pakt "${task.title}"`, { description: "Anderen zien dat jij dit doet." });
    else toast(`"${task.title}" vrijgegeven`);
    set({ tasks: get().tasks.map((t) => (t.id === taskId ? updated : t)) });
  },

  async createTask(input) {
    const store = await getDataStore();
    const { householdId } = get();
    if (!householdId) return;
    const created = await store.createTask(householdId, input);
    toast.success(`"${created.title}" toegevoegd`, {
      description: input.roomId ? undefined : "Gedeelde pool",
    });
    set({ tasks: [...get().tasks, created] });
  },

  async deleteTask(taskId) {
    const store = await getDataStore();
    await store.deleteTask(taskId);
    set({
      tasks: get().tasks.filter((t) => t.id !== taskId),
      completions: get().completions.filter((c) => c.taskId !== taskId),
    });
  },

  async createRoom(room) {
    const store = await getDataStore();
    const { householdId } = get();
    if (!householdId) return;
    const created = await store.createRoom(householdId, room);
    toast.success(`"${created.name}" toegevoegd`);
    set({ rooms: [...get().rooms, created] });
  },

  async updateRoom(roomId, patch) {
    const store = await getDataStore();
    const updated = await store.updateRoom(roomId, patch);
    toast("Kamer bijgewerkt");
    set({ rooms: get().rooms.map((r) => (r.id === roomId ? updated : r)) });
  },

  async deleteRoom(roomId) {
    const store = await getDataStore();
    await store.deleteRoom(roomId);
    toast("Kamer verwijderd");
    set({ rooms: get().rooms.filter((r) => r.id !== roomId) });
  },

  async createBundle(bundle, taskTitles) {
    const store = await getDataStore();
    const { householdId } = get();
    if (!householdId) return;
    const created = await store.createBundle(householdId, bundle);
    const createdTasks = await Promise.all(
      taskTitles
        .filter((title) => title.trim())
        .map((title) =>
          store.createTask(householdId, {
            title: title.trim(),
            bundleId: created.id,
            intervalDays: bundle.cadence === "daily" ? 1 : 7,
          }),
        ),
    );
    toast.success(`"${created.name}" aangemaakt`);
    set({ bundles: [...get().bundles, created], tasks: [...get().tasks, ...createdTasks] });
  },

  async updateBundle(bundleId, patch, taskTitles) {
    const store = await getDataStore();
    const { householdId } = get();
    if (!householdId) return;
    const updated = await store.updateBundle(bundleId, patch);
    let { tasks } = get();
    if (taskTitles) {
      const existing = tasks.filter((t) => t.bundleId === bundleId);
      await Promise.all(existing.map((t) => store.deleteTask(t.id)));
      const created = await Promise.all(
        taskTitles
          .filter((title) => title.trim())
          .map((title) =>
            store.createTask(householdId, {
              title: title.trim(),
              bundleId,
              intervalDays: updated.cadence === "daily" ? 1 : 7,
            }),
          ),
      );
      tasks = [...tasks.filter((t) => t.bundleId !== bundleId), ...created];
    }
    toast("Routine bijgewerkt");
    set({ bundles: get().bundles.map((b) => (b.id === bundleId ? updated : b)), tasks });
  },

  async deleteBundle(bundleId) {
    const store = await getDataStore();
    await store.deleteBundle(bundleId);
    toast("Routine verwijderd");
    set({
      bundles: get().bundles.filter((b) => b.id !== bundleId),
      tasks: get().tasks.filter((t) => t.bundleId !== bundleId),
    });
  },
}));
