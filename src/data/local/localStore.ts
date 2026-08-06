import { z } from "zod";
import {
  HouseholdSchema,
  MemberSchema,
  HouseholdMemberSchema,
  HouseholdInviteSchema,
  RoomSchema,
  TaskSchema,
  TaskCompletionSchema,
  BundleSchema,
  ShoppingItemSchema,
} from "../schemas";
import type { Database, Household, HouseholdInvite, Member, Room, Task, TaskCompletion, Bundle, ShoppingItem } from "../types";
import { normalizeShoppingItemPatch, type CreateTaskInput, type CreateShoppingItemInput, type DataStore, type UpdateShoppingItemInput } from "../store";
import { seedDatabase, LOCAL_USER_ID } from "./seed";

const STORAGE_KEY = "cura:db:v1";

const uid = (): string => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * Validate a persisted array entity-by-entity, tolerating a single bad row —
 * the local-mode counterpart of `mapList` in supabaseStore.ts. One task with
 * an unexpected shape (a stale field, a schema change between versions) must
 * not take down the rest of the household's data (see #150 / the #54
 * timestamptz-offset crash CLAUDE.md §3 references for the cloud-mode version
 * of this same bug class).
 */
function parseList<S extends z.ZodTypeAny>(rows: unknown, schema: S, label: string): z.infer<S>[] {
  if (!Array.isArray(rows)) return [];
  const out: z.infer<S>[] = [];
  for (const row of rows) {
    const result = schema.safeParse(row);
    if (result.success) out.push(result.data);
    else console.error(`Overslaan van ongeldige ${label}-rij bij het laden`, result.error, row);
  }
  return out;
}

/**
 * Validates a single entity against its schema right before it's written —
 * the write-time boundary check `persist()` deliberately stopped doing for
 * the WHOLE snapshot (#171: re-parsing the unboundedly-growing completions
 * array on every write was a real, scaling cost for zero benefit — see the
 * comment on persist() below). Scoped to just the one entity being
 * created/updated, this stays cheap while closing the gap that left: a
 * type-valid-but-schema-invalid patch (e.g. an emptied checklist-item title
 * slipping past a UI guard) used to write straight through and only surface
 * on the NEXT loadDatabase() — where parseList drops the WHOLE entity, not
 * just the bad field. Strict, not tolerant, like supabaseStore.ts's
 * single-row write mappers (CLAUDE.md §3): an invalid write is a real error
 * the caller's toast should show, not something to silently swallow. Called
 * on a candidate BEFORE any mutation, so a rejected write leaves the
 * in-memory entity untouched.
 */
function validateEntity<S extends z.ZodTypeAny>(schema: S, candidate: unknown, label: string): void {
  const result = schema.safeParse(candidate);
  if (!result.success) {
    console.error(`Ongeldige ${label} bij opslaan`, result.error, candidate);
    throw new Error(`Kon ${label} niet opslaan — controleer de invoer.`);
  }
}

// At least one of these existing as an array is enough to tell "this is a
// stale/partially-valid Database snapshot" apart from "this isn't our data at
// all" (e.g. a different app's localStorage key, or garbage) — only the
// latter warrants a full reseed.
const DATABASE_LIST_KEYS = [
  "households", "members", "householdMembers", "invites", "rooms", "tasks", "completions", "bundles", "shoppingItems",
] as const;

function looksLikeDatabase(source: Record<string, unknown>): boolean {
  return DATABASE_LIST_KEYS.some((key) => Array.isArray(source[key]));
}

function seedAndPersist(): Database {
  const seeded = seedDatabase();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
  return seeded;
}

function loadDatabase(): Database {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return seedAndPersist();

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Not even valid JSON — nothing to salvage.
    return seedAndPersist();
  }

  if (typeof parsed !== "object" || parsed === null || !looksLikeDatabase(parsed as Record<string, unknown>)) {
    // Doesn't resemble a Database at all — reseed rather than crash.
    return seedAndPersist();
  }

  const source = parsed as Record<string, unknown>;
  return {
    households: parseList(source.households, HouseholdSchema, "household"),
    members: parseList(source.members, MemberSchema, "member"),
    householdMembers: parseList(source.householdMembers, HouseholdMemberSchema, "household-member"),
    invites: parseList(source.invites, HouseholdInviteSchema, "invite"),
    rooms: parseList(source.rooms, RoomSchema, "room"),
    tasks: parseList(source.tasks, TaskSchema, "task"),
    completions: parseList(source.completions, TaskCompletionSchema, "completion"),
    bundles: parseList(source.bundles, BundleSchema, "bundle"),
    shoppingItems: parseList(source.shoppingItems, ShoppingItemSchema, "shopping item"),
  };
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
    // No re-validation here (#171) — this.db is only ever mutated by this
    // class's own typed methods, and the one real validation boundary is
    // loadDatabase() on read. Re-parsing the FULL database (including the
    // one entity that grows unbounded, completions) on every single write
    // was a real, scaling cost with zero benefit: it can only catch a bug
    // in this file, which typecheck already guards against structurally,
    // and by the time it would catch one, the bad data is already in `this.db`.
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
    const candidate = {
      ...member,
      ...(patch.displayName !== undefined && { displayName: patch.displayName }),
      ...(patch.quietHoursStart !== undefined && { quietHoursStart: patch.quietHoursStart ?? undefined }),
      ...(patch.quietHoursEnd !== undefined && { quietHoursEnd: patch.quietHoursEnd ?? undefined }),
    };
    validateEntity(MemberSchema, candidate, "lid");
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
    validateEntity(HouseholdSchema, { ...household, name }, "huishouden");
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
    validateEntity(RoomSchema, created, "kamer");
    this.db.rooms.push(created);
    this.persist();
    return created;
  }

  async updateRoom(roomId: string, patch: Partial<Omit<Room, "id" | "householdId">>): Promise<Room> {
    const room = this.db.rooms.find((r) => r.id === roomId);
    if (!room) throw new Error(`Room not found: ${roomId}`);
    validateEntity(RoomSchema, { ...room, ...patch }, "kamer");
    Object.assign(room, patch);
    this.persist();
    return room;
  }

  async deleteRoom(roomId: string): Promise<void> {
    this.db.rooms = this.db.rooms.filter((r) => r.id !== roomId);
    // Mirrors the cloud schema's `room_id ... on delete set null` — a task
    // that lived in the deleted room becomes roomless (a valid, already-
    // supported state, see Task.roomId), not a dangling reference that
    // renders with a blank kamer field.
    for (const task of this.db.tasks) {
      if (task.roomId === roomId) task.roomId = undefined;
    }
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
      dagdeel: input.dagdeel,
      bundleId: input.bundleId,
      planned: input.planned ?? false,
      startedAt: input.startedAt,
      checklistItems: input.checklistItems ?? [],
    };
    validateEntity(TaskSchema, created, "taak");
    this.db.tasks.push(created);
    this.persist();
    return created;
  }

  async updateTask(taskId: string, patch: Partial<CreateTaskInput>): Promise<Task> {
    const task = this.db.tasks.find((t) => t.id === taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);
    validateEntity(TaskSchema, { ...task, ...patch }, "taak");
    Object.assign(task, patch);
    this.persist();
    return task;
  }

  async deleteTask(taskId: string): Promise<void> {
    this.db.tasks = this.db.tasks.filter((t) => t.id !== taskId);
    this.db.completions = this.db.completions.filter((c) => c.taskId !== taskId);
    this.persist();
  }

  async claimTask(taskId: string, userId: string | null, trackPickup = false): Promise<Task> {
    const task = this.db.tasks.find((t) => t.id === taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);
    task.claimedById = userId ?? undefined;
    if (!userId) task.pickedUpAt = undefined;
    else if (trackPickup) task.pickedUpAt = new Date().toISOString();
    this.persist();
    return task;
  }

  async assignTask(taskId: string, memberId: string | null): Promise<Task> {
    const task = this.db.tasks.find((t) => t.id === taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);
    task.claimedById = memberId ?? undefined;
    if (!memberId) task.pickedUpAt = undefined;
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
    validateEntity(BundleSchema, created, "routine");
    this.db.bundles.push(created);
    this.persist();
    return created;
  }

  async updateBundle(bundleId: string, patch: Partial<Omit<Bundle, "id" | "householdId">>): Promise<Bundle> {
    const bundle = this.db.bundles.find((b) => b.id === bundleId);
    if (!bundle) throw new Error(`Bundle not found: ${bundleId}`);
    validateEntity(BundleSchema, { ...bundle, ...patch }, "routine");
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
    validateEntity(ShoppingItemSchema, created, "boodschap");
    this.db.shoppingItems.push(created);
    this.persist();
    return created;
  }

  async updateShoppingItem(itemId: string, patch: UpdateShoppingItemInput): Promise<ShoppingItem> {
    const item = this.db.shoppingItems.find((i) => i.id === itemId);
    if (!item) throw new Error(`Shopping item not found: ${itemId}`);
    const normalized = normalizeShoppingItemPatch(patch);
    const candidate = {
      ...item,
      ...(normalized.title !== undefined && { title: normalized.title }),
      ...("amount" in normalized && { amount: normalized.amount }),
      ...("unit" in normalized && { unit: normalized.unit }),
      ...("description" in normalized && { description: normalized.description }),
      ...(normalized.category !== undefined && { category: normalized.category }),
    };
    validateEntity(ShoppingItemSchema, candidate, "boodschap");
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
