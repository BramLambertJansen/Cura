import { beforeEach, describe, expect, it } from "vitest";
import { LocalStore } from "./localStore";

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
      quantity: "2",
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
  it("updates the title and clears quantity when the quantity patch is empty", async () => {
    const store = new LocalStore();
    const updated = await store.updateShoppingItem("s1", { title: "  Koffie  ", quantity: "   " });

    expect(updated.title).toBe("Koffie");
    expect(updated.quantity).toBeUndefined();
    await expect(store.listShoppingItems("h1")).resolves.toMatchObject([
      { id: "s1", title: "Koffie", quantity: undefined },
    ]);
  });
});
