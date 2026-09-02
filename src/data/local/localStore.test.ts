import { beforeEach, describe, expect, it, vi } from "vitest";
import { LocalStore } from "./localStore";
import { LOCAL_USER_ID } from "./seed";

const STORAGE_KEY = "cura:db:v1";

const baseDb = {
  households: [{ id: "h1", name: "Thuis", timeZone: "Europe/Amsterdam" }],
  members: [{ id: "m1", householdId: "h1", displayName: "Bram" }],
  householdMembers: [{ userId: "local-user", householdId: "h1" }],
  invites: [],
  rooms: [],
  tasks: [],
  completions: [],
  bundles: [],
  shoppingItems: [
    {
      id: "s1",
      householdId: "h1",
      title: "Melk",
      amount: 2,
      unit: "l",
      checked: false,
      createdAt: "2026-07-09T08:00:00.000Z",
    },
  ],
};

beforeEach(() => {
  const storage = new Map<string, string>();
  (globalThis as { localStorage?: Storage }).localStorage = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => { storage.set(key, value); },
    removeItem: (key: string) => { storage.delete(key); },
    clear: () => { storage.clear(); },
    key: (index: number) => [...storage.keys()][index] ?? null,
    get length() { return storage.size; },
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(baseDb));
});

describe("LocalStore shopping items", () => {
  it("updates the title and the amount/unit", async () => {
    const store = new LocalStore();
    const updated = await store.updateShoppingItem("s1", { title: "  Koffie  ", amount: 1, unit: "kg" });

    expect(updated.title).toBe("Koffie");
    expect(updated.amount).toBe(1);
    expect(updated.unit).toBe("kg");
    await expect(store.listShoppingItems("h1")).resolves.toMatchObject([
      { id: "s1", title: "Koffie", amount: 1, unit: "kg" },
    ]);
  });

  it("clears the amount when the patch explicitly sets it to undefined", async () => {
    const store = new LocalStore();
    const updated = await store.updateShoppingItem("s1", { title: "Melk", amount: undefined });

    expect(updated.amount).toBeUndefined();
  });
});

describe("LocalStore CRUD (#155)", () => {
  it("deleteRoom clears roomId on tasks that lived in it instead of leaving a dangling reference", async () => {
    const store = new LocalStore();
    const room = await store.createRoom("h1", { name: "Badkamer", iconKey: "droplets", color: "#5A8FA8" });
    const task = await store.createTask("h1", { title: "Douche schoonmaken", roomId: room.id });

    await store.deleteRoom(room.id);

    await expect(store.listRooms("h1")).resolves.toEqual([]);
    await expect(store.listTasks("h1")).resolves.toEqual([{ ...task, roomId: undefined }]);
    // A fresh instance re-reads from localStorage — confirms persist() wrote the cleared roomId, not just in-memory state.
    await expect(new LocalStore().listTasks("h1")).resolves.toEqual([{ ...task, roomId: undefined }]);
  });

  it("createRoom assigns an id/householdId and persists it", async () => {
    const store = new LocalStore();
    const created = await store.createRoom("h1", { name: "Badkamer", iconKey: "droplets", color: "#5A8FA8" });

    expect(created.id).toBeTruthy();
    expect(created.householdId).toBe("h1");
    await expect(store.listRooms("h1")).resolves.toEqual([created]);
    // A fresh instance re-reads from localStorage — confirms persist() actually wrote it.
    await expect(new LocalStore().listRooms("h1")).resolves.toEqual([created]);
  });

  it("createTask fills in planned/checklistItems defaults", async () => {
    const store = new LocalStore();
    const created = await store.createTask("h1", { title: "Afwas doen" });

    expect(created.planned).toBe(false);
    expect(created.checklistItems).toEqual([]);
    await expect(store.listTasks("h1")).resolves.toEqual([created]);
  });

  it("updateTask merges the patch onto the existing task", async () => {
    const store = new LocalStore();
    const created = await store.createTask("h1", { title: "Afwas doen", durationMin: 10 });

    const updated = await store.updateTask(created.id, { title: "Afwas en droogrek", planned: true });

    expect(updated).toMatchObject({ id: created.id, title: "Afwas en droogrek", planned: true, durationMin: 10 });
  });

  it("claimTask sets claimedById, only stamps pickedUpAt when trackPickup is true, and clears both on release", async () => {
    const store = new LocalStore();
    const created = await store.createTask("h1", { title: "Wasmachine aanzetten" });

    const softClaimed = await store.claimTask(created.id, "m1");
    expect(softClaimed.claimedById).toBe("m1");
    expect(softClaimed.pickedUpAt).toBeUndefined();

    const pickedUp = await store.claimTask(created.id, "m1", true);
    expect(pickedUp.pickedUpAt).toBeTruthy();

    const released = await store.claimTask(created.id, null);
    expect(released.claimedById).toBeUndefined();
    expect(released.pickedUpAt).toBeUndefined();
  });

  it("assignTask sets claimedById by member id directly, never stamping pickedUpAt", async () => {
    const store = new LocalStore();
    const created = await store.createTask("h1", { title: "Boodschappen doen" });

    const assigned = await store.assignTask(created.id, "m1");
    expect(assigned.claimedById).toBe("m1");
    expect(assigned.pickedUpAt).toBeUndefined();

    const cleared = await store.assignTask(created.id, null);
    expect(cleared.claimedById).toBeUndefined();
  });

  it("completeTask records a completion for the acting user, retrievable via listCompletions", async () => {
    const store = new LocalStore();
    const created = await store.createTask("h1", { title: "Stofzuigen" });

    const completion = await store.completeTask(created.id, "m1");

    expect(completion).toMatchObject({ taskId: created.id, completedById: "m1" });
    await expect(store.listCompletions("h1")).resolves.toEqual([completion]);
  });

  it("deleteBundle removes the bundle and cascades to its tasks", async () => {
    const store = new LocalStore();
    const bundle = await store.createBundle("h1", { name: "Ochtendroutine", trigger: "'s ochtends", cadence: "daily", windowLabel: "ochtenden" });
    const bundleTask = await store.createTask("h1", { title: "Bed opmaken", bundleId: bundle.id, intervalDays: 1 });
    const otherTask = await store.createTask("h1", { title: "Boodschappen doen" });

    await store.deleteBundle(bundle.id);

    await expect(store.listBundles("h1")).resolves.toEqual([]);
    const remainingTasks = await store.listTasks("h1");
    expect(remainingTasks.map((t) => t.id)).toEqual([otherTask.id]);
    expect(remainingTasks.some((t) => t.id === bundleTask.id)).toBe(false);
  });
});

describe("LocalStore AI-voorstellen/MCP (Phase 4 — never available in local mode)", () => {
  it("listTaskSuggestions is always an empty list", async () => {
    const store = new LocalStore();
    await expect(store.listTaskSuggestions("h1")).resolves.toEqual([]);
  });

  it("deleteTaskSuggestion/listMcpTokens/createMcpToken/revokeMcpToken all throw a clear, catchable error", async () => {
    const store = new LocalStore();
    await expect(store.deleteTaskSuggestion("s1")).rejects.toThrow();
    await expect(store.listMcpTokens("h1")).rejects.toThrow();
    await expect(store.createMcpToken("h1", "Bram's Claude")).rejects.toThrow();
    await expect(store.revokeMcpToken("tok1")).rejects.toThrow();
  });
});

describe("LocalStore write-time validation (Codex review on #202)", () => {
  it("rejects updateTask when the patch would produce an empty title, leaving the task unchanged", async () => {
    const store = new LocalStore();
    const created = await store.createTask("h1", { title: "Afwas doen" });

    await expect(store.updateTask(created.id, { title: "" })).rejects.toThrow();
    await expect(store.listTasks("h1")).resolves.toMatchObject([{ title: "Afwas doen" }]);
  });

  it("rejects updateTask when a checklist item has an empty title", async () => {
    const store = new LocalStore();
    const created = await store.createTask("h1", { title: "Boodschappen doen" });

    await expect(
      store.updateTask(created.id, { checklistItems: [{ id: "c1", title: "", checked: false }] }),
    ).rejects.toThrow();
    await expect(store.listTasks("h1")).resolves.toMatchObject([{ checklistItems: [] }]);
  });

  it("rejects createRoom/updateRoom with an empty name", async () => {
    const store = new LocalStore();
    await expect(
      store.createRoom("h1", { name: "", iconKey: "droplets", color: "#5A8FA8" }),
    ).rejects.toThrow();

    const room = await store.createRoom("h1", { name: "Badkamer", iconKey: "droplets", color: "#5A8FA8" });
    await expect(store.updateRoom(room.id, { name: "" })).rejects.toThrow();
    await expect(store.listRooms("h1")).resolves.toMatchObject([{ name: "Badkamer" }]);
  });

  it("rejects updateShoppingItem when the patch would produce an empty title", async () => {
    const store = new LocalStore();
    await expect(store.updateShoppingItem("s1", { title: "" })).rejects.toThrow();
    await expect(store.listShoppingItems("h1")).resolves.toMatchObject([{ title: "Melk" }]);
  });

  it("rejects updateMember when quietHoursStart isn't HH:mm", async () => {
    const store = new LocalStore();
    await expect(store.updateMember("m1", { quietHoursStart: "not-a-time" })).rejects.toThrow();
  });
});

describe("LocalStore loadDatabase resilience (#150)", () => {
  it("skips a single invalid row instead of reseeding the whole snapshot", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const corrupted = {
      ...baseDb,
      tasks: [
        { id: "t1", householdId: "h1", title: "Afwas doen", planned: false },
        // Invalid: title is required and non-empty — this row should be skipped, not the rest.
        { id: "t2", householdId: "h1", title: "" },
      ],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(corrupted));

    const store = new LocalStore();

    await expect(store.listTasks("h1")).resolves.toMatchObject([{ id: "t1", title: "Afwas doen" }]);
    await expect(store.listShoppingItems("h1")).resolves.toMatchObject([{ id: "s1" }]);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("reseeds when the persisted value doesn't resemble a Database at all", async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ some: "unrelated blob" }));

    const store = new LocalStore();

    await expect(store.getHouseholdsForUser(LOCAL_USER_ID)).resolves.not.toHaveLength(0);
  });

  it("reseeds when the persisted value isn't valid JSON", async () => {
    localStorage.setItem(STORAGE_KEY, "not json{{{");

    const store = new LocalStore();

    await expect(store.getHouseholdsForUser(LOCAL_USER_ID)).resolves.not.toHaveLength(0);
  });
});
