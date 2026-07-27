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
