import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Bundle, Household, Member, Task } from "../data/types";
import type { DataStore } from "../data/store";

// useCuraStore owns a module-level DataStore singleton (getDataStore()/
// dataStorePromise) resolved from createDataStore() — mock the factory so
// every test controls exactly what the "backend" does, without touching
// localStorage or a real Supabase client. sonner's toast is both callable
// and carries .success/.error, so the mock needs the same shape.
const createDataStoreMock = vi.hoisted(() => vi.fn());
vi.mock("../data/store", () => ({ createDataStore: createDataStoreMock }));

const toastMock = vi.hoisted(() => {
  const fn = vi.fn() as ReturnType<typeof vi.fn> & { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  fn.success = vi.fn();
  fn.error = vi.fn();
  return fn;
});
vi.mock("sonner", () => ({ toast: toastMock }));

import { useCuraStore } from "./useCuraStore";

const household = (overrides: Partial<Household> = {}): Household => ({
  id: "h1", name: "Thuis", timeZone: "Europe/Amsterdam", ...overrides,
});
const member = (overrides: Partial<Member> = {}): Member => ({
  id: "m1", householdId: "h1", displayName: "Bram", ...overrides,
});
const task = (overrides: Partial<Task> = {}): Task => ({
  id: "t1", householdId: "h1", title: "Taak", planned: false, checklistItems: [], ...overrides,
});
const bundle = (overrides: Partial<Bundle> = {}): Bundle => ({
  id: "b1", householdId: "h1", name: "Ochtendroutine", trigger: "'s ochtends", cadence: "daily", windowLabel: "ochtenden", ...overrides,
});

/** A fully-stubbed DataStore — every method is a vi.fn() with a harmless default, overridable per test. */
function makeStore(overrides: Partial<DataStore> = {}): DataStore {
  const defaults: DataStore = {
    mode: "local",
    currentUserId: vi.fn().mockResolvedValue("u1"),
    getHouseholdsForUser: vi.fn().mockResolvedValue([household()]),
    listMembers: vi.fn().mockResolvedValue([]),
    updateMember: vi.fn(),
    createHousehold: vi.fn(),
    updateHousehold: vi.fn(),
    createInvite: vi.fn(),
    acceptInvite: vi.fn(),
    revokeInvite: vi.fn(),
    listRooms: vi.fn().mockResolvedValue([]),
    createRoom: vi.fn(),
    updateRoom: vi.fn(),
    deleteRoom: vi.fn(),
    listCategories: vi.fn().mockResolvedValue([]),
    createCategory: vi.fn(),
    updateCategory: vi.fn(),
    deleteCategory: vi.fn().mockResolvedValue(undefined),
    listTasks: vi.fn().mockResolvedValue([]),
    createTask: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn().mockResolvedValue(undefined),
    claimTask: vi.fn(),
    assignTask: vi.fn(),
    completeTask: vi.fn(),
    uncompleteTask: vi.fn().mockResolvedValue(undefined),
    listCompletions: vi.fn().mockResolvedValue([]),
    listBundles: vi.fn().mockResolvedValue([]),
    createBundle: vi.fn(),
    updateBundle: vi.fn(),
    deleteBundle: vi.fn().mockResolvedValue(undefined),
    listShoppingItems: vi.fn().mockResolvedValue([]),
    createShoppingItem: vi.fn(),
    updateShoppingItem: vi.fn(),
    toggleShoppingItem: vi.fn(),
    deleteShoppingItem: vi.fn().mockResolvedValue(undefined),
    subscribeToChanges: vi.fn(() => () => {}),
    savePushSubscription: vi.fn().mockResolvedValue(undefined),
    deletePushSubscription: vi.fn().mockResolvedValue(undefined),
  } as unknown as DataStore;
  return { ...defaults, ...overrides };
}

let initialState: ReturnType<typeof useCuraStore.getState>;

beforeEach(() => {
  initialState = useCuraStore.getState();
  createDataStoreMock.mockReset();
  toastMock.mockClear();
  toastMock.success.mockClear();
  toastMock.error.mockClear();
});

afterEach(() => {
  useCuraStore.getState().reset(); // clears dataStorePromise + any realtime subscription/timer
  useCuraStore.setState(initialState, true);
  vi.useRealTimers();
});

describe("updateBundle task diffing", () => {
  it("keeps unchanged tasks untouched, deletes dropped ones, creates new ones", async () => {
    const bedOpmaken = task({ id: "t1", title: "Bed opmaken", bundleId: "b1", intervalDays: 1 });
    const afwasDoen = task({ id: "t2", title: "Afwas doen", bundleId: "b1", intervalDays: 1 });
    const stofzuigen = task({ id: "t3", title: "Stofzuigen", bundleId: "b1", intervalDays: 1 });
    const newTask = task({ id: "t4", title: "Nieuwe taak", bundleId: "b1", intervalDays: 1 });
    const store = makeStore({
      updateBundle: vi.fn().mockResolvedValue(bundle({ cadence: "daily" })),
      createTask: vi.fn().mockResolvedValue(newTask),
    });
    createDataStoreMock.mockResolvedValue(store);
    useCuraStore.setState({ householdId: "h1", bundles: [bundle()], tasks: [bedOpmaken, afwasDoen, stofzuigen] });

    await useCuraStore.getState().updateBundle("b1", {}, [
      { title: "Bed opmaken" },
      { title: "Afwas doen" },
      { title: "Nieuwe taak" },
    ]);

    expect(store.deleteTask).toHaveBeenCalledExactlyOnceWith("t3");
    expect(store.createTask).toHaveBeenCalledExactlyOnceWith("h1", {
      title: "Nieuwe taak", bundleId: "b1", intervalDays: 1, durationMin: undefined, description: undefined,
    });
    // Neither kept task's interval/duration/description actually changed, so
    // there's nothing to write back — updateTask must not fire for either.
    expect(store.updateTask).not.toHaveBeenCalled();

    const ids = useCuraStore.getState().tasks.map((t) => t.id).sort();
    expect(ids).toEqual(["t1", "t2", "t4"]);
    expect(useCuraStore.getState().tasks.find((t) => t.id === "t1")).toBe(bedOpmaken);
    expect(useCuraStore.getState().tasks.find((t) => t.id === "t2")).toBe(afwasDoen);
    expect(toastMock.success).toHaveBeenCalledWith("Routine bijgewerkt");
  });

  it("writes back intervalDays for kept tasks when the routine's cadence changes", async () => {
    const bedOpmaken = task({ id: "t1", title: "Bed opmaken", bundleId: "b1", intervalDays: 1 });
    const weeklyBedOpmaken = { ...bedOpmaken, intervalDays: 7 };
    const store = makeStore({
      updateBundle: vi.fn().mockResolvedValue(bundle({ cadence: "weekly" })),
      updateTask: vi.fn().mockResolvedValue(weeklyBedOpmaken),
    });
    createDataStoreMock.mockResolvedValue(store);
    useCuraStore.setState({ householdId: "h1", bundles: [bundle()], tasks: [bedOpmaken] });

    await useCuraStore.getState().updateBundle("b1", { cadence: "weekly" }, [{ title: "Bed opmaken" }]);

    expect(store.updateTask).toHaveBeenCalledExactlyOnceWith("t1", { intervalDays: 7 });
    expect(useCuraStore.getState().tasks).toEqual([weeklyBedOpmaken]);
  });

  it("keeps a task whose delete rejects instead of losing it, and reports the partial failure", async () => {
    const kept = task({ id: "t1", title: "Bed opmaken", bundleId: "b1", intervalDays: 1 });
    const failsToDelete = task({ id: "t2", title: "Afwas doen", bundleId: "b1", intervalDays: 1 });
    const store = makeStore({
      updateBundle: vi.fn().mockResolvedValue(bundle({ cadence: "daily" })),
      deleteTask: vi.fn().mockImplementation((id: string) =>
        id === "t2" ? Promise.reject(new Error("network blip")) : Promise.resolve(undefined)),
    });
    createDataStoreMock.mockResolvedValue(store);
    useCuraStore.setState({ householdId: "h1", bundles: [bundle()], tasks: [kept, failsToDelete] });

    // "Afwas doen" is no longer in the draft list — a normal diff would delete it.
    await useCuraStore.getState().updateBundle("b1", {}, [{ title: "Bed opmaken" }]);

    const ids = useCuraStore.getState().tasks.map((t) => t.id).sort();
    expect(ids).toEqual(["t1", "t2"]); // t2 survives because its delete failed
    expect(toastMock.error).toHaveBeenCalledWith("Routine deels bijgewerkt — niet alles is gelukt");
  });
});

describe("toggleTask", () => {
  it("ignores a second toggle for the same task while the first is still in flight", async () => {
    const t = task({ id: "dbltap-1", planned: true });
    useCuraStore.setState({ tasks: [t], currentUserId: "u1" });
    const store = makeStore({
      completeTask: vi.fn().mockResolvedValue({ id: "c1", taskId: t.id, completedById: "u1", completedAt: new Date().toISOString() }),
    });
    createDataStoreMock.mockResolvedValue(store);

    // Fired back-to-back with no await in between — the `toggling` guard is
    // checked synchronously at the top of the action, before either call
    // reaches its first await, so the second must see the first still marked
    // in-flight and no-op regardless of how fast completeTask resolves.
    const p1 = useCuraStore.getState().toggleTask(t.id, true);
    const p2 = useCuraStore.getState().toggleTask(t.id, true); // double-tap — should no-op
    await Promise.all([p1, p2]);

    expect(store.completeTask).toHaveBeenCalledTimes(1);
  });
});

/** A promise plus its own resolve, so a test can control resolution order from the outside. */
function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => { resolve = res; });
  return { promise, resolve };
}

describe("assignTask race guard", () => {
  it("keeps only the result of the most recently-called assign, even if it resolves out of order", async () => {
    const t = task({ id: "t1", title: "Afwas doen" });
    useCuraStore.setState({
      tasks: [t],
      members: [member({ id: "m1", displayName: "Bram" }), member({ id: "m2", displayName: "Stéphanie" })],
      currentUserId: "u1",
    });
    // Created up front so `.resolve` is a real function immediately — the
    // store action itself hasn't reached store.assignTask() yet at this point
    // (it's still a few awaits away), so anything captured only once the mock
    // is *invoked* would still be undefined when the test tries to use it.
    const first = deferred<Task>();
    const second = deferred<Task>();
    const store = makeStore({
      assignTask: vi.fn().mockImplementationOnce(() => first.promise).mockImplementationOnce(() => second.promise),
    });
    createDataStoreMock.mockResolvedValue(store);

    const p1 = useCuraStore.getState().assignTask(t.id, "m1");
    const p2 = useCuraStore.getState().assignTask(t.id, "m2");
    // The newer call (m2) resolves first; the older one (m1) resolves late,
    // out of network-timing order — its result must not overwrite m2's.
    second.resolve({ ...t, claimedById: "m2" });
    await p2;
    first.resolve({ ...t, claimedById: "m1" });
    await p1;

    expect(useCuraStore.getState().tasks.find((task_) => task_.id === t.id)?.claimedById).toBe("m2");
  });
});

describe("realtime debounce (useCuraStore.init)", () => {
  it("collapses a burst of onChange events into a single debounced refresh", async () => {
    vi.useFakeTimers();
    let onChange: (() => void) | undefined;
    const store = makeStore({
      subscribeToChanges: vi.fn((_householdId: string, cb: () => void) => {
        onChange = cb;
        return vi.fn();
      }),
    });
    createDataStoreMock.mockResolvedValue(store);

    await useCuraStore.getState().init();
    expect(store.listMembers).toHaveBeenCalledTimes(1);

    onChange?.();
    onChange?.();
    onChange?.();
    expect(store.listMembers).toHaveBeenCalledTimes(1); // still debouncing

    await vi.advanceTimersByTimeAsync(400);
    expect(store.listMembers).toHaveBeenCalledTimes(2); // one collapsed refresh, not three
  });

  it("discards a debounced refresh if the household changed before the timer fired", async () => {
    vi.useFakeTimers();
    let onChange: (() => void) | undefined;
    const store = makeStore({
      subscribeToChanges: vi.fn((_householdId: string, cb: () => void) => {
        onChange = cb;
        return vi.fn();
      }),
    });
    createDataStoreMock.mockResolvedValue(store);

    await useCuraStore.getState().init();
    expect(store.listMembers).toHaveBeenCalledTimes(1);

    onChange?.();
    // Simulates reset()/re-init to a different household racing the pending timer.
    useCuraStore.setState({ householdId: "some-other-household" });
    await vi.advanceTimersByTimeAsync(400);

    expect(store.listMembers).toHaveBeenCalledTimes(1); // the stale refresh was discarded
  });
});

describe("createTask / updateTask planned auto-claim", () => {
  it("auto-claims a task created directly onto the day", async () => {
    const created = task({ id: "t1", title: "Boodschappen", planned: true });
    const claimed = { ...created, claimedById: "u1" };
    const store = makeStore({
      createTask: vi.fn().mockResolvedValue(created),
      claimTask: vi.fn().mockResolvedValue(claimed),
    });
    createDataStoreMock.mockResolvedValue(store);
    useCuraStore.setState({ householdId: "h1", currentUserId: "u1", tasks: [] });

    await useCuraStore.getState().createTask({ title: "Boodschappen", planned: true });

    expect(store.claimTask).toHaveBeenCalledExactlyOnceWith("t1", "u1");
    expect(useCuraStore.getState().tasks).toEqual([claimed]);
  });

  it("auto-claims only on the unplanned-to-planned transition, never re-claiming an already-planned task", async () => {
    const alreadyPlanned = task({ id: "t1", planned: true, claimedById: "m2" });
    const store = makeStore({ updateTask: vi.fn().mockResolvedValue({ ...alreadyPlanned, title: "Bijgewerkt" }) });
    createDataStoreMock.mockResolvedValue(store);
    useCuraStore.setState({ householdId: "h1", currentUserId: "u1", tasks: [alreadyPlanned] });

    await useCuraStore.getState().updateTask("t1", { title: "Bijgewerkt", planned: true });

    expect(store.claimTask).not.toHaveBeenCalled();
  });
});

describe("deleteBundle", () => {
  it("removes the bundle and cascades removal of its tasks", async () => {
    const bundleTask = task({ id: "t1", bundleId: "b1" });
    const otherTask = task({ id: "t2", bundleId: "b2" });
    const store = makeStore();
    createDataStoreMock.mockResolvedValue(store);
    useCuraStore.setState({ bundles: [bundle({ id: "b1" }), bundle({ id: "b2" })], tasks: [bundleTask, otherTask] });

    await useCuraStore.getState().deleteBundle("b1");

    expect(useCuraStore.getState().bundles.map((b) => b.id)).toEqual(["b2"]);
    expect(useCuraStore.getState().tasks.map((t) => t.id)).toEqual(["t2"]);
  });
});

// withToastOnError (#155) now backs ~19 of the simpler actions — exercised
// here through createRoom as a representative, on both the success and
// failure paths (a real Error's own message vs. the fallback for a
// non-Error rejection), since every wrapped action shares this exact contract.
describe("withToastOnError", () => {
  it("shows the success toast and applies the state update", async () => {
    const created = { id: "r1", householdId: "h1", name: "Keuken", iconKey: "utensils", color: "#000" };
    const store = makeStore({ createRoom: vi.fn().mockResolvedValue(created) });
    createDataStoreMock.mockResolvedValue(store);
    useCuraStore.setState({ householdId: "h1", rooms: [] });

    await useCuraStore.getState().createRoom({ name: "Keuken", iconKey: "utensils", color: "#000" });

    expect(toastMock.success).toHaveBeenCalledWith(`"Keuken" toegevoegd`);
    expect(useCuraStore.getState().rooms).toEqual([created]);
  });

  it("toasts the thrown Error's own message, and leaves state untouched", async () => {
    const store = makeStore({ createRoom: vi.fn().mockRejectedValue(new Error("Kamer bestaat al")) });
    createDataStoreMock.mockResolvedValue(store);
    useCuraStore.setState({ householdId: "h1", rooms: [] });

    await useCuraStore.getState().createRoom({ name: "Keuken", iconKey: "utensils", color: "#000" });

    expect(toastMock.error).toHaveBeenCalledWith("Kamer bestaat al");
    expect(useCuraStore.getState().rooms).toEqual([]);
  });

  it("deleteRoom clears roomId on any in-memory tasks that lived in it", async () => {
    const room = { id: "r1", householdId: "h1", name: "Badkamer", iconKey: "droplets", color: "#000" };
    const inRoom = task({ id: "t1", roomId: "r1" });
    const elsewhere = task({ id: "t2", roomId: "r2" });
    const store = makeStore({ deleteRoom: vi.fn().mockResolvedValue(undefined) });
    createDataStoreMock.mockResolvedValue(store);
    useCuraStore.setState({ householdId: "h1", rooms: [room], tasks: [inRoom, elsewhere] });

    await useCuraStore.getState().deleteRoom("r1");

    expect(useCuraStore.getState().rooms).toEqual([]);
    expect(useCuraStore.getState().tasks).toEqual([{ ...inRoom, roomId: undefined }, elsewhere]);
  });

  it("falls back to the action's own message for a non-Error rejection", async () => {
    const store = makeStore({ createRoom: vi.fn().mockRejectedValue("network down") });
    createDataStoreMock.mockResolvedValue(store);
    useCuraStore.setState({ householdId: "h1", rooms: [] });

    await useCuraStore.getState().createRoom({ name: "Keuken", iconKey: "utensils", color: "#000" });

    expect(toastMock.error).toHaveBeenCalledWith("Toevoegen lukte niet");
  });
});
