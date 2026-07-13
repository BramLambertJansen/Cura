import { DatabaseSchema } from "../schemas";
import type { Database, Household, HouseholdInvite, Member, Room, Task, TaskCompletion, Bundle, ShoppingItem } from "../types";
import { normalizeShoppingItemPatch, type CreateTaskInput, type CreateShoppingItemInput, type DataStore, type UpdateShoppingItemInput } from "../store";
import { seedDatabase, LOCAL_USER_ID } from "./seed";

const STORAGE_KEY = "cura:db:v1";

const uid = (): string => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function loadDatabase(): Database {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = seedDatabase();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
  try {
    return DatabaseSchema.parse(JSON.parse(raw));
  } catch {
    // Corrupt or stale shape — degrade gracefully by reseeding rather than crashing.
    const seeded = seedDatabase();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
}

/**
 * `local` mode: localStorage, single implicit household, solo (CLAUDE.md §4).
 * Validates against the Zod schemas at load and persists the whole snapshot
 * on every write — simple and correct at this scale (one household, no
 * concurrent writers).
 */
export class LocalStore implements DataStore {
  readonly mode = "local" as const;
  private db: Database;

  constructor() {
    this.db = loadDatabase();
  }

  private persist(): void {
    DatabaseSchema.parse(this.db);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.db));
  }

  async currentUserId(): Promise<string> {
    return LOCAL_USER_ID;
  }

  async getHouseholdsForUser(userId: string): Promise<Household[]> {
    const ids = new Set(
      this.db.householdMembers.filter((hm) => hm.userId === userId).map((hm) => hm.householdId),
    );
    return this.db.households.filter((h) => ids.has(h.id));
  }

  async listMembers(householdId: string): Promise<Member[]> {
    return this.db.members.filter((m) => m.householdId === householdId);
  }

  async updateMember(
    memberId: string,
    patch: { displayName?: string; quietHoursStart?: string | null; quietHoursEnd?: string | null },
  ): Promise<Member> {
    const member = this.db.members.find((m) => m.id === memberId);
    if (!member) throw new Error(`Member not found: ${memberId}`);
    if (patch.displayName !== undefined) member.displayName = patch.displayName;
    if (patch.quietHoursStart !== undefined) member.quietHoursStart = patch.quietHoursStart ?? undefined;
    if (patch.quietHoursEnd !== undefined) member.quietHoursEnd = patch.quietHoursEnd ?? undefined;
    this.persist();
    return member;
  }

  async createHousehold(): Promise<Household> {
    throw new Error("Creating a household isn't available in local mode (there's always exactly one).");
  }

  async updateHousehold(householdId: string, name: string): Promise<Household> {
    const household = this.db.households.find((h) => h.id === householdId);
    if (!household) throw new Error(`Household not found: ${householdId}`);
    household.name = name;
    this.persist();
    return household;
  }

  async createInvite(): Promise<HouseholdInvite> {
    throw new Error("Invites are not available in local mode (single device, solo).");
  }

  async acceptInvite(): Promise<{ ok: true } | { ok: false; reason: "already_member" | "invalid" | "expired" }> {
    return { ok: false, reason: "invalid" };
  }

  async revokeInvite(): Promise<void> {
    throw new Error("Invites are not available in local mode (single device, solo).");
  }

  async listRooms(householdId: string): Promise<Room[]> {
    return this.db.rooms.filter((r) => r.householdId === householdId);
  }

  async createRoom(householdId: string, room: Omit<Room, "id" | "householdId">): Promise<Room> {
    const created: Room = { ...room, id: uid(), householdId };
    this.db.rooms.push(created);
    this.persist();
    return created;
  }

  async updateRoom(roomId: string, patch: Partial<Omit<Room, "id" | "householdId">>): Promise<Room> {
    const room = this.db.rooms.find((r) => r.id === roomId);
    if (!room) throw new Error(`Room not found: ${roomId}`);
    Object.assign(room, patch);
    this.persist();
    return room;
  }

  async deleteRoom(roomId: string): Promise<void> {
    this.db.rooms = this.db.rooms.filter((r) => r.id !== roomId);
    this.persist();
  }

  async listTasks(householdId: string): Promise<Task[]> {
    return this.db.tasks.filter((t) => t.householdId === householdId);
  }

  async createTask(householdId: string, input: CreateTaskInput): Promise<Task> {
    const created: Task = {
      id: uid(),
      householdId,
      roomId: input.roomId,
      title: input.title,
      description: input.description,
      durationMin: input.durationMin,
      intervalDays: input.intervalDays,
      dueDate: input.dueDate,
      bundleId: input.bundleId,
      planned: input.planned ?? false,
      startedAt: input.startedAt,
      checklistItems: input.checklistItems ?? [],
    };
    this.db.tasks.push(created);
    this.persist();
    return created;
  }

  async updateTask(taskId: string, patch: Partial<CreateTaskInput>): Promise<Task> {
    const task = this.db.tasks.find((t) => t.id === taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);
    Object.assign(task, patch);
    this.persist();
    return task;
  }

  async deleteTask(taskId: string): Promise<void> {
    this.db.tasks = this.db.tasks.filter((t) => t.id !== taskId);
    this.db.completions = this.db.completions.filter((c) => c.taskId !== taskId);
    this.persist();
  }

  async claimTask(taskId: string, userId: string | null): Promise<Task> {
    const task = this.db.tasks.find((t) => t.id === taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);
    task.claimedById = userId ?? undefined;
    this.persist();
    return task;
  }

  async completeTask(taskId: string, userId: string): Promise<TaskCompletion> {
    const completion: TaskCompletion = {
      id: uid(),
      taskId,
      completedById: userId,
      completedAt: new Date().toISOString(),
    };
    this.db.completions.push(completion);
    this.persist();
    return completion;
  }

  async uncompleteTask(taskId: string): Promise<void> {
    const matches = this.db.completions
      .filter((c) => c.taskId === taskId)
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt));
    const latest = matches[0];
    if (!latest) return;
    this.db.completions = this.db.completions.filter((c) => c.id !== latest.id);
    this.persist();
  }

  async listCompletions(householdId: string, since?: string): Promise<TaskCompletion[]> {
    const taskIds = new Set(this.db.tasks.filter((t) => t.householdId === householdId).map((t) => t.id));
    return this.db.completions.filter((c) => taskIds.has(c.taskId) && (!since || c.completedAt >= since));
  }

  async listBundles(householdId: string): Promise<Bundle[]> {
    return this.db.bundles.filter((b) => b.householdId === householdId);
  }

  async createBundle(householdId: string, bundle: Omit<Bundle, "id" | "householdId">): Promise<Bundle> {
    const created: Bundle = { ...bundle, id: uid(), householdId };
    this.db.bundles.push(created);
    this.persist();
    return created;
  }

  async updateBundle(bundleId: string, patch: Partial<Omit<Bundle, "id" | "householdId">>): Promise<Bundle> {
    const bundle = this.db.bundles.find((b) => b.id === bundleId);
    if (!bundle) throw new Error(`Bundle not found: ${bundleId}`);
    Object.assign(bundle, patch);
    this.persist();
    return bundle;
  }

  async deleteBundle(bundleId: string): Promise<void> {
    this.db.bundles = this.db.bundles.filter((b) => b.id !== bundleId);
    this.db.tasks = this.db.tasks.filter((t) => t.bundleId !== bundleId);
    this.persist();
  }

  async listShoppingItems(householdId: string): Promise<ShoppingItem[]> {
    return this.db.shoppingItems.filter((i) => i.householdId === householdId);
  }

  async createShoppingItem(householdId: string, input: CreateShoppingItemInput): Promise<ShoppingItem> {
    const created: ShoppingItem = {
      id: uid(),
      householdId,
      title: input.title,
      amount: input.amount,
      unit: input.unit,
      description: input.description,
      category: input.category,
      checked: false,
      createdAt: new Date().toISOString(),
    };
    this.db.shoppingItems.push(created);
    this.persist();
    return created;
  }

  async updateShoppingItem(itemId: string, patch: UpdateShoppingItemInput): Promise<ShoppingItem> {
    const item = this.db.shoppingItems.find((i) => i.id === itemId);
    if (!item) throw new Error(`Shopping item not found: ${itemId}`);
    const normalized = normalizeShoppingItemPatch(patch);
    if (normalized.title !== undefined) item.title = normalized.title;
    if ("amount" in normalized) item.amount = normalized.amount;
    if ("unit" in normalized) item.unit = normalized.unit;
    if ("description" in normalized) item.description = normalized.description;
    if (normalized.category !== undefined) item.category = normalized.category;
    this.persist();
    return item;
  }

  async toggleShoppingItem(itemId: string, checked: boolean): Promise<ShoppingItem> {
    const item = this.db.shoppingItems.find((i) => i.id === itemId);
    if (!item) throw new Error(`Shopping item not found: ${itemId}`);
    item.checked = checked;
    this.persist();
    return item;
  }

  async deleteShoppingItem(itemId: string): Promise<void> {
    this.db.shoppingItems = this.db.shoppingItems.filter((i) => i.id !== itemId);
    this.persist();
  }

  /** Single device, solo — there's nothing else writing to localStorage to listen for. */
  subscribeToChanges(): () => void {
    return () => {};
  }

  // Web Push needs a server to send from; local mode has none. No-ops keep the
  // ProfielSheet toggle / usePushSubscription flow branch-free across modes —
  // in local mode the in-app poller (useTaskReminders) remains the only channel.
  async savePushSubscription(): Promise<void> {}
  async deletePushSubscription(): Promise<void> {}
}
