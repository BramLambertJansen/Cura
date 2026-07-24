import { supabase } from "./supabaseClient";
import { normalizeShoppingItemPatch, type CreateTaskInput, type CreateShoppingItemInput, type DataStore, type PushSubscriptionInput, type UpdateShoppingItemInput } from "../store";
import type { Household, HouseholdInvite, Member, Room, Task, TaskCompletion, Bundle, ShoppingItem } from "../types";
import {
  HouseholdSchema,
  MemberSchema,
  HouseholdInviteSchema,
  RoomSchema,
  TaskSchema,
  TaskCompletionSchema,
  BundleSchema,
  ShoppingItemSchema,
} from "../schemas";

const uid = (): string => crypto.randomUUID();

// Hand-written row shapes, matching supabase/migrations/20260630000000_init.sql
// column-for-column — no live DB access in this sandbox to generate types.

interface HouseholdRow { id: string; name: string; time_zone: string }
interface MemberRow {
  id: string; household_id: string; display_name: string; user_id: string | null;
  quiet_hours_start: string | null; quiet_hours_end: string | null;
}
interface InviteRow { token: string; household_id: string; created_by_id: string; created_at: string; expires_at: string | null }
interface RoomRow { id: string; household_id: string; name: string; icon_key: string; color: string; owner_id: string | null }
interface BundleRow { id: string; household_id: string; name: string; trigger: string; cadence: "daily" | "weekly"; window_label: string }
interface TaskRow {
  id: string; household_id: string; room_id: string | null; title: string;
  description: string | null;
  duration_min: number | null; interval_days: number | null; due_date: string | null;
  bundle_id: string | null; claimed_by_id: string | null; planned: boolean;
  started_at: string | null;
  checklist_items: { id: string; title: string; checked: boolean }[];
  picked_up_at: string | null;
}
interface CompletionRow { id: string; task_id: string; completed_by_id: string; completed_at: string }
interface ShoppingItemRow {
  id: string; household_id: string; title: string;
  quantity: string | null; // legacy free text, no longer written by the app
  amount: number | null; unit: string | null; description: string | null;
  category: string | null; checked: boolean; created_at: string;
}
interface PushSubscriptionRow {
  id: string; household_id: string; member_id: string;
  endpoint: string; p256dh: string; auth: string; created_at: string;
}

// Email/password signup stores the chosen name under `displayName`; Google
// OAuth instead populates `full_name`/`name` from the Google profile — no
// `displayName` field is ever set for those users.
function metadataDisplayName(user: { user_metadata?: Record<string, unknown> }): string {
  const meta = user.user_metadata ?? {};
  return (
    (meta.displayName as string | undefined) ??
    (meta.full_name as string | undefined) ??
    (meta.name as string | undefined) ??
    "Ik"
  );
}

function mapHousehold(r: HouseholdRow): Household {
  return HouseholdSchema.parse({ id: r.id, name: r.name, timeZone: r.time_zone });
}
function mapMember(r: MemberRow): Member {
  return MemberSchema.parse({
    id: r.id, householdId: r.household_id, displayName: r.display_name, userId: r.user_id ?? undefined,
    quietHoursStart: r.quiet_hours_start ?? undefined,
    quietHoursEnd: r.quiet_hours_end ?? undefined,
  });
}
function mapInvite(r: InviteRow): HouseholdInvite {
  return HouseholdInviteSchema.parse({
    token: r.token, householdId: r.household_id, createdById: r.created_by_id,
    createdAt: r.created_at, expiresAt: r.expires_at ?? undefined,
  });
}
function mapRoom(r: RoomRow): Room {
  return RoomSchema.parse({ id: r.id, householdId: r.household_id, name: r.name, iconKey: r.icon_key, color: r.color, ownerId: r.owner_id ?? undefined });
}
function mapBundle(r: BundleRow): Bundle {
  return BundleSchema.parse({ id: r.id, householdId: r.household_id, name: r.name, trigger: r.trigger, cadence: r.cadence, windowLabel: r.window_label });
}
function mapTask(r: TaskRow): Task {
  return TaskSchema.parse({
    id: r.id, householdId: r.household_id, roomId: r.room_id ?? undefined, title: r.title,
    description: r.description ?? undefined,
    durationMin: r.duration_min ?? undefined, intervalDays: r.interval_days ?? undefined,
    dueDate: r.due_date ?? undefined, bundleId: r.bundle_id ?? undefined,
    claimedById: r.claimed_by_id ?? undefined, planned: r.planned,
    pickedUpAt: r.picked_up_at ?? undefined,
    startedAt: r.started_at ?? undefined,
    checklistItems: r.checklist_items ?? [],
  });
}
function mapCompletion(r: CompletionRow): TaskCompletion {
  return TaskCompletionSchema.parse({ id: r.id, taskId: r.task_id, completedById: r.completed_by_id, completedAt: r.completed_at });
}
function mapShoppingItem(r: ShoppingItemRow): ShoppingItem {
  return ShoppingItemSchema.parse({
    id: r.id, householdId: r.household_id, title: r.title,
    quantity: r.quantity ?? undefined,
    amount: r.amount ?? undefined, unit: r.unit ?? undefined, description: r.description ?? undefined,
    category: r.category ?? undefined, checked: r.checked, createdAt: r.created_at,
  });
}

// Optional shopping_items columns added after the initial table (category,
// then amount/unit/description) — since migrations apply manually and can lag
// behind deployed code, a request touching a not-yet-migrated column must
// degrade instead of throwing (same reasoning as the category column before it).
const NEW_SHOPPING_COLUMNS = ["category", "amount", "unit", "description"] as const;

export function isMissingShoppingColumn(error: unknown): boolean {
  const err = error as { code?: string; message?: string } | null | undefined;
  if (err?.code !== "PGRST204" || typeof err.message !== "string") return false;
  const message = err.message;
  return NEW_SHOPPING_COLUMNS.some((col) => message.includes(`'${col}'`)) && message.includes("'shopping_items'");
}

function withoutNewShoppingColumns<T extends Partial<Record<(typeof NEW_SHOPPING_COLUMNS)[number], unknown>>>(row: T): T {
  const clone = { ...row };
  for (const col of NEW_SHOPPING_COLUMNS) delete clone[col];
  return clone;
}

// Optional tasks columns added after the initial table (started_at,
// checklist_items, picked_up_at) — since migrations apply manually and can lag
// behind deployed code, a request touching a not-yet-migrated column must
// degrade instead of throwing (same reasoning/pattern as the shopping_items
// columns above — kept as a second, table-scoped trio rather than a shared helper).
const NEW_TASK_COLUMNS = ["started_at", "checklist_items", "picked_up_at"] as const;

/**
 * Which of NEW_TASK_COLUMNS a PGRST204 "column not found" error is actually
 * naming — PostgREST reports one missing column per error, so this is never
 * more than one entry, but callers must re-check after each retry (a second
 * column can still be missing behind the first). NEVER used to justify
 * dropping the whole trio for one column's absence — an earlier version of
 * this fallback did exactly that and would silently discard started_at/
 * checklist_items on an insert whose only real problem was a still-missing
 * picked_up_at column (a deployment mid-migration-rollout).
 */
export function missingTaskColumns(error: unknown): (typeof NEW_TASK_COLUMNS)[number][] {
  const err = error as { code?: string; message?: string } | null | undefined;
  if (err?.code !== "PGRST204" || typeof err.message !== "string" || !err.message.includes("'tasks'")) return [];
  const message = err.message;
  return NEW_TASK_COLUMNS.filter((col) => message.includes(`'${col}'`));
}

export function isMissingTaskColumn(error: unknown): boolean {
  return missingTaskColumns(error).length > 0;
}

function withoutTaskColumns<T extends Partial<Record<(typeof NEW_TASK_COLUMNS)[number], unknown>>>(
  row: T,
  cols: readonly (typeof NEW_TASK_COLUMNS)[number][],
): T {
  const clone = { ...row };
  for (const col of cols) delete clone[col];
  return clone;
}

export function shoppingItemUpdateRow(patch: UpdateShoppingItemInput): Partial<ShoppingItemRow> {
  const normalized = normalizeShoppingItemPatch(patch);
  const update: Partial<ShoppingItemRow> = {};
  if (normalized.title !== undefined) update.title = normalized.title;
  if ("amount" in normalized) update.amount = normalized.amount ?? null;
  if ("unit" in normalized) update.unit = normalized.unit ?? null;
  if ("description" in normalized) update.description = normalized.description ?? null;
  if (normalized.category !== undefined) update.category = normalized.category;
  return update;
}

/**
 * Map a list of rows, tolerating a single bad one.
 *
 * The initial load reads EVERY row for the household. Before this, one row that
 * failed schema validation (an unexpected timestamp format, an out-of-range
 * value, a NULL that shouldn't be) threw straight out of `.map()` and took down
 * the whole `init()` — the app then showed "Laden lukte even niet" on every
 * restart, because the same server data reloaded and threw again (this is how
 * the timestamptz-offset bug in #54 surfaced). CLAUDE.md §3 wants the app to
 * degrade gracefully with partial data, not brick on one row: skip-and-log the
 * odd row so the rest of the household still loads. A dropped row reappears the
 * moment its data (or the schema) is fixed — nothing is deleted.
 *
 * Kept to the bulk LIST reads (startup path). Single-row write mappers stay
 * strict: a write that comes back unparseable is a real error the caller
 * surfaces as a toast, not a row to silently swallow.
 */
export function mapList<Row, T>(rows: readonly Row[], map: (r: Row) => T, label: string): T[] {
  const out: T[] = [];
  for (const row of rows) {
    try {
      out.push(map(row));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(`Overslaan van onleesbare ${label}-rij bij het laden`, e, row);
    }
  }
  return out;
}

/**
 * `cloud` mode: Supabase (Postgres + RLS + auth), CLAUDE.md §4 Phase 3.
 *
 * IMPORTANT: completed_by_id / claimed_by_id / created_by_id / owner_id all
 * reference members.id, NOT the Supabase auth user id. currentUserId() below
 * returns the raw auth uid (auth.uid()) — every write that touches one of
 * those columns must first resolve it to a members.id via memberIdFor().
 */
export class SupabaseStore implements DataStore {
  readonly mode = "cloud" as const;

  async currentUserId(): Promise<string> {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw new Error("Niet ingelogd.");
    return data.user.id;
  }

  /** Resolves an auth user id to their members.id within a specific household. */
  private async memberIdFor(userId: string, householdId: string): Promise<string> {
    const { data, error } = await supabase
      .from("members")
      .select("id")
      .eq("user_id", userId)
      .eq("household_id", householdId)
      .single();
    if (error || !data) throw new Error("Kon lid niet vinden in dit huishouden.");
    return (data as { id: string }).id;
  }

  // ── Households ────────────────────────────────────────────────────────────
  async getHouseholdsForUser(userId: string): Promise<Household[]> {
    const { data, error } = await supabase
      .from("household_members")
      .select("households(id, name, time_zone)")
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as unknown as { households: HouseholdRow | null }[];
    return rows.filter((r) => r.households).map((r) => mapHousehold(r.households!));
  }

  async listMembers(householdId: string): Promise<Member[]> {
    const { data, error } = await supabase.from("members").select("*").eq("household_id", householdId);
    if (error) throw new Error(error.message);
    return mapList((data ?? []) as MemberRow[], mapMember, "member");
  }

  async updateMember(
    memberId: string,
    patch: { displayName?: string; quietHoursStart?: string | null; quietHoursEnd?: string | null },
  ): Promise<Member> {
    const update: Record<string, unknown> = {};
    if (patch.displayName !== undefined) update.display_name = patch.displayName;
    if (patch.quietHoursStart !== undefined) update.quiet_hours_start = patch.quietHoursStart;
    if (patch.quietHoursEnd !== undefined) update.quiet_hours_end = patch.quietHoursEnd;
    const { data, error } = await supabase.from("members").update(update).eq("id", memberId).select().single();
    if (error || !data) throw new Error(error?.message ?? `Member not found: ${memberId}`);
    return mapMember(data as MemberRow);
  }

  async createHousehold(name: string): Promise<Household> {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw new Error("Niet ingelogd.");
    const displayName = metadataDisplayName(userData.user);
    const householdId = uid();
    const memberId = uid();
    const { error } = await supabase.rpc("create_household", {
      p_household_id: householdId,
      p_household_name: name,
      p_member_id: memberId,
      p_display_name: displayName,
    });
    if (error) throw new Error(error.message);
    // time_zone isn't returned by the RPC; mirror the DB column default so the
    // freshly-created household carries the same value a re-fetch would.
    return mapHousehold({ id: householdId, name, time_zone: "Europe/Amsterdam" });
  }

  async updateHousehold(householdId: string, name: string): Promise<Household> {
    const { data, error } = await supabase.from("households").update({ name }).eq("id", householdId).select().single();
    if (error || !data) throw new Error(error?.message ?? `Household not found: ${householdId}`);
    return mapHousehold(data as HouseholdRow);
  }

  // ── Invites ──────────────────────────────────────────────────────────────
  // Invite links expire 7 days after creation and are single-use — accept_invite
  // deletes the row on successful redemption (see the migration).
  async createInvite(householdId: string): Promise<HouseholdInvite> {
    const authUserId = await this.currentUserId();
    const memberId = await this.memberIdFor(authUserId, householdId);
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    const row: InviteRow = {
      token: uid(),
      household_id: householdId,
      created_by_id: memberId,
      created_at: createdAt.toISOString(),
      expires_at: expiresAt.toISOString(),
    };
    const { error } = await supabase.from("household_invites").insert(row);
    if (error) throw new Error(error.message);
    return mapInvite(row);
  }

  async revokeInvite(token: string): Promise<void> {
    const { error } = await supabase.from("household_invites").delete().eq("token", token);
    if (error) throw new Error(error.message);
  }

  async acceptInvite(token: string): Promise<{ ok: true } | { ok: false; reason: "already_member" | "invalid" | "expired" }> {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw new Error("Niet ingelogd.");
    const displayName = metadataDisplayName(userData.user);
    const memberId = uid();
    const { data, error } = await supabase.rpc("accept_invite", {
      p_token: token,
      p_member_id: memberId,
      p_display_name: displayName,
    });
    if (error) throw new Error(error.message);
    return data as { ok: true } | { ok: false; reason: "already_member" | "invalid" | "expired" };
  }

  // ── Rooms ────────────────────────────────────────────────────────────────
  async listRooms(householdId: string): Promise<Room[]> {
    const { data, error } = await supabase.from("rooms").select("*").eq("household_id", householdId);
    if (error) throw new Error(error.message);
    return mapList((data ?? []) as RoomRow[], mapRoom, "room");
  }

  async createRoom(householdId: string, room: Omit<Room, "id" | "householdId">): Promise<Room> {
    const row: RoomRow = {
      id: uid(), household_id: householdId, name: room.name, icon_key: room.iconKey,
      color: room.color, owner_id: room.ownerId ?? null,
    };
    const { error } = await supabase.from("rooms").insert(row);
    if (error) throw new Error(error.message);
    return mapRoom(row);
  }

  async updateRoom(roomId: string, patch: Partial<Omit<Room, "id" | "householdId">>): Promise<Room> {
    const update: Partial<RoomRow> = {};
    if (patch.name !== undefined) update.name = patch.name;
    if (patch.iconKey !== undefined) update.icon_key = patch.iconKey;
    if (patch.color !== undefined) update.color = patch.color;
    if (patch.ownerId !== undefined) update.owner_id = patch.ownerId ?? null;
    const { data, error } = await supabase.from("rooms").update(update).eq("id", roomId).select().single();
    if (error || !data) throw new Error(error?.message ?? `Room not found: ${roomId}`);
    return mapRoom(data as RoomRow);
  }

  async deleteRoom(roomId: string): Promise<void> {
    const { error } = await supabase.from("rooms").delete().eq("id", roomId);
    if (error) throw new Error(error.message);
  }

  // ── Tasks ────────────────────────────────────────────────────────────────
  async listTasks(householdId: string): Promise<Task[]> {
    const { data, error } = await supabase.from("tasks").select("*").eq("household_id", householdId);
    if (error) throw new Error(error.message);
    return mapList((data ?? []) as TaskRow[], mapTask, "task");
  }

  async createTask(householdId: string, input: CreateTaskInput): Promise<Task> {
    let row: TaskRow = {
      id: uid(), household_id: householdId, room_id: input.roomId ?? null, title: input.title,
      description: input.description ?? null,
      duration_min: input.durationMin ?? null, interval_days: input.intervalDays ?? null,
      due_date: input.dueDate ?? null, bundle_id: input.bundleId ?? null,
      claimed_by_id: null, planned: input.planned ?? false,
      started_at: input.startedAt ?? null,
      checklist_items: input.checklistItems ?? [],
      picked_up_at: null,
    };
    // Each retry drops only the column(s) THIS error actually named — never
    // the whole NEW_TASK_COLUMNS trio — so a lone still-missing column never
    // takes a sibling that's already migrated down with it. Bounded by
    // NEW_TASK_COLUMNS.length since a retry can reveal at most one new
    // missing column per attempt.
    for (let attempt = 0; attempt <= NEW_TASK_COLUMNS.length; attempt++) {
      const { error } = await supabase.from("tasks").insert(row);
      if (!error) return mapTask(row);
      const missing = missingTaskColumns(error);
      if (missing.length === 0) throw new Error(error.message);
      row = withoutTaskColumns(row, missing);
    }
    throw new Error("Taak aanmaken mislukt: onverwacht veel ontbrekende kolommen op 'tasks'.");
  }

  async updateTask(taskId: string, patch: Partial<CreateTaskInput>): Promise<Task> {
    let update: Partial<TaskRow> = {};
    if (patch.title !== undefined) update.title = patch.title;
    if (patch.description !== undefined) update.description = patch.description ?? null;
    if (patch.roomId !== undefined) update.room_id = patch.roomId ?? null;
    if (patch.durationMin !== undefined) update.duration_min = patch.durationMin ?? null;
    if (patch.intervalDays !== undefined) update.interval_days = patch.intervalDays ?? null;
    if (patch.dueDate !== undefined) update.due_date = patch.dueDate ?? null;
    if (patch.bundleId !== undefined) update.bundle_id = patch.bundleId ?? null;
    if (patch.planned !== undefined) update.planned = patch.planned;
    // Key-presence check (not !== undefined): EditTaskSheet always sends this
    // key, including `startedAt: undefined` to explicitly clear it (the
    // "Gestart" toggle turned off) — an !== undefined guard would silently
    // skip that clear.
    if ("startedAt" in patch) update.started_at = patch.startedAt ?? null;
    if ("checklistItems" in patch) update.checklist_items = patch.checklistItems ?? [];
    for (let attempt = 0; attempt <= NEW_TASK_COLUMNS.length; attempt++) {
      const query = Object.keys(update).length > 0
        ? supabase.from("tasks").update(update).eq("id", taskId).select().single()
        : supabase.from("tasks").select("*").eq("id", taskId).single();
      const { data, error } = await query;
      if (!error) {
        if (!data) throw new Error(`Task not found: ${taskId}`);
        return mapTask(data as TaskRow);
      }
      const missing = missingTaskColumns(error);
      if (missing.length === 0) throw new Error(error.message);
      update = withoutTaskColumns(update, missing);
    }
    throw new Error("Taak bijwerken mislukt: onverwacht veel ontbrekende kolommen op 'tasks'.");
  }

  async deleteTask(taskId: string): Promise<void> {
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);
    if (error) throw new Error(error.message);
  }

  async claimTask(taskId: string, userId: string | null, trackPickup = false): Promise<Task> {
    let claimedById: string | null = null;
    if (userId) {
      const { data: taskData, error: taskError } = await supabase.from("tasks").select("household_id").eq("id", taskId).single();
      if (taskError || !taskData) throw new Error(`Task not found: ${taskId}`);
      claimedById = await this.memberIdFor(userId, (taskData as { household_id: string }).household_id);
    }
    // Unclaiming always clears picked_up_at. Claiming stamps it only when
    // trackPickup is set (the explicit Huis pool-claim action) — the generic
    // planned-auto-claim (createTask/updateTask) omits the key entirely so it
    // never touches an existing value.
    let update: Partial<TaskRow> = { claimed_by_id: claimedById };
    if (!claimedById) update.picked_up_at = null;
    else if (trackPickup) update.picked_up_at = new Date().toISOString();

    for (let attempt = 0; attempt <= NEW_TASK_COLUMNS.length; attempt++) {
      const { data, error } = await supabase.from("tasks").update(update).eq("id", taskId).select().single();
      if (!error) {
        if (!data) throw new Error(`Task not found: ${taskId}`);
        return mapTask(data as TaskRow);
      }
      const missing = missingTaskColumns(error);
      if (missing.length === 0) throw new Error(error.message);
      update = withoutTaskColumns(update, missing);
    }
    throw new Error("Taak claimen mislukt: onverwacht veel ontbrekende kolommen op 'tasks'.");
  }

  async assignTask(taskId: string, memberId: string | null): Promise<Task> {
    let update: Partial<TaskRow> = { claimed_by_id: memberId };
    if (!memberId) update.picked_up_at = null;

    for (let attempt = 0; attempt <= NEW_TASK_COLUMNS.length; attempt++) {
      const { data, error } = await supabase.from("tasks").update(update).eq("id", taskId).select().single();
      if (!error) {
        if (!data) throw new Error(`Task not found: ${taskId}`);
        return mapTask(data as TaskRow);
      }
      const missing = missingTaskColumns(error);
      if (missing.length === 0) throw new Error(error.message);
      update = withoutTaskColumns(update, missing);
    }
    throw new Error("Taak toewijzen mislukt: onverwacht veel ontbrekende kolommen op 'tasks'.");
  }

  // ── Completions ──────────────────────────────────────────────────────────
  async completeTask(taskId: string, userId: string): Promise<TaskCompletion> {
    const { data: taskData, error: taskError } = await supabase.from("tasks").select("household_id").eq("id", taskId).single();
    if (taskError || !taskData) throw new Error(`Task not found: ${taskId}`);
    const memberId = await this.memberIdFor(userId, (taskData as { household_id: string }).household_id);
    const row: CompletionRow = { id: uid(), task_id: taskId, completed_by_id: memberId, completed_at: new Date().toISOString() };
    const { error } = await supabase.from("task_completions").insert(row);
    if (error) throw new Error(error.message);
    return mapCompletion(row);
  }

  async uncompleteTask(taskId: string): Promise<void> {
    const { data, error } = await supabase
      .from("task_completions")
      .select("id")
      .eq("task_id", taskId)
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return;
    const { error: deleteError } = await supabase.from("task_completions").delete().eq("id", (data as { id: string }).id);
    if (deleteError) throw new Error(deleteError.message);
  }

  async listCompletions(householdId: string, since?: string): Promise<TaskCompletion[]> {
    let query = supabase
      .from("task_completions")
      .select("id, task_id, completed_by_id, completed_at, tasks!inner(household_id)")
      .eq("tasks.household_id", householdId);
    if (since) query = query.gte("completed_at", since);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return mapList((data ?? []) as unknown as CompletionRow[], mapCompletion, "completion");
  }

  // ── Bundles ──────────────────────────────────────────────────────────────
  async listBundles(householdId: string): Promise<Bundle[]> {
    const { data, error } = await supabase.from("bundles").select("*").eq("household_id", householdId);
    if (error) throw new Error(error.message);
    return mapList((data ?? []) as BundleRow[], mapBundle, "bundle");
  }

  async createBundle(householdId: string, bundle: Omit<Bundle, "id" | "householdId">): Promise<Bundle> {
    const row: BundleRow = {
      id: uid(), household_id: householdId, name: bundle.name, trigger: bundle.trigger,
      cadence: bundle.cadence, window_label: bundle.windowLabel,
    };
    const { error } = await supabase.from("bundles").insert(row);
    if (error) throw new Error(error.message);
    return mapBundle(row);
  }

  async updateBundle(bundleId: string, patch: Partial<Omit<Bundle, "id" | "householdId">>): Promise<Bundle> {
    const update: Partial<BundleRow> = {};
    if (patch.name !== undefined) update.name = patch.name;
    if (patch.trigger !== undefined) update.trigger = patch.trigger;
    if (patch.cadence !== undefined) update.cadence = patch.cadence;
    if (patch.windowLabel !== undefined) update.window_label = patch.windowLabel;
    const { data, error } = await supabase.from("bundles").update(update).eq("id", bundleId).select().single();
    if (error || !data) throw new Error(error?.message ?? `Bundle not found: ${bundleId}`);
    return mapBundle(data as BundleRow);
  }

  async deleteBundle(bundleId: string): Promise<void> {
    // tasks.bundle_id is ON DELETE SET NULL in the migration, but LocalStore
    // deletes the bundle's tasks outright (localStore.ts) — match that here.
    const { error: tasksError } = await supabase.from("tasks").delete().eq("bundle_id", bundleId);
    if (tasksError) throw new Error(tasksError.message);
    const { error } = await supabase.from("bundles").delete().eq("id", bundleId);
    if (error) throw new Error(error.message);
  }

  // ── Shopping list ────────────────────────────────────────────────────────
  async listShoppingItems(householdId: string): Promise<ShoppingItem[]> {
    const { data, error } = await supabase.from("shopping_items").select("*").eq("household_id", householdId);
    if (error) throw new Error(error.message);
    return ((data ?? []) as ShoppingItemRow[]).map(mapShoppingItem);
  }

  async createShoppingItem(householdId: string, input: CreateShoppingItemInput): Promise<ShoppingItem> {
    const row: ShoppingItemRow = {
      id: uid(), household_id: householdId, title: input.title,
      quantity: null,
      amount: input.amount ?? null, unit: input.unit ?? null, description: input.description ?? null,
      category: input.category ?? null, checked: false, created_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("shopping_items").insert(row);
    if (error) {
      if (!isMissingShoppingColumn(error)) throw new Error(error.message);
      const { error: retryError } = await supabase.from("shopping_items").insert(withoutNewShoppingColumns(row));
      if (retryError) throw new Error(retryError.message);
      return mapShoppingItem({ ...row, category: null, amount: null, unit: null, description: null });
    }
    return mapShoppingItem(row);
  }

  async updateShoppingItem(itemId: string, patch: UpdateShoppingItemInput): Promise<ShoppingItem> {
    const update = shoppingItemUpdateRow(patch);
    const { data, error } = await supabase.from("shopping_items").update(update).eq("id", itemId).select().single();
    if (error) {
      if (!isMissingShoppingColumn(error)) throw new Error(error.message);
      const retryUpdate = withoutNewShoppingColumns(update);
      const retryQuery = Object.keys(retryUpdate).length > 0
        ? supabase.from("shopping_items").update(retryUpdate).eq("id", itemId).select().single()
        : supabase.from("shopping_items").select("*").eq("id", itemId).single();
      const { data: retryData, error: retryError } = await retryQuery;
      if (retryError || !retryData) throw new Error(retryError?.message ?? `Shopping item not found: ${itemId}`);
      return mapShoppingItem(retryData as ShoppingItemRow);
    }
    if (!data) throw new Error(`Shopping item not found: ${itemId}`);
    return mapShoppingItem(data as ShoppingItemRow);
  }

  async toggleShoppingItem(itemId: string, checked: boolean): Promise<ShoppingItem> {
    const { data, error } = await supabase.from("shopping_items").update({ checked }).eq("id", itemId).select().single();
    if (error || !data) throw new Error(error?.message ?? `Shopping item not found: ${itemId}`);
    return mapShoppingItem(data as ShoppingItemRow);
  }

  async deleteShoppingItem(itemId: string): Promise<void> {
    const { error } = await supabase.from("shopping_items").delete().eq("id", itemId);
    if (error) throw new Error(error.message);
  }

  // ── Realtime (Phase 3+) ──────────────────────────────────────────────────
  // One channel per household, subscribed to every table the household view
  // depends on. tasks/rooms/bundles/members/shopping_items carry household_id
  // and are filtered server-side; task_completions has no household_id of its own
  // (only via a join to tasks), so it's subscribed unfiltered and relies on
  // the same RLS policy (task_completions_select) that gates normal reads —
  // Supabase's Realtime "postgres_changes" feed is RLS-aware for the
  // authenticated session. `onChange` is a single coalescing callback; the
  // caller (useCuraStore) debounces its own refetch, so a burst of remote
  // writes (e.g. someone completing several tasks) triggers one refresh, not
  // one per row.
  subscribeToChanges(householdId: string, onChange: () => void): () => void {
    const channel = supabase
      .channel(`household-${householdId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `household_id=eq.${householdId}` }, onChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms", filter: `household_id=eq.${householdId}` }, onChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "bundles", filter: `household_id=eq.${householdId}` }, onChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "members", filter: `household_id=eq.${householdId}` }, onChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "shopping_items", filter: `household_id=eq.${householdId}` }, onChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "task_completions" }, onChange)
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }

  // ── Web Push subscriptions (Phase: push notifications) ────────────────────
  // member_id references members.id (not auth.uid()) — resolved via memberIdFor,
  // matching every other write in this store. Upsert on the unique `endpoint`
  // so re-subscribing the same browser refreshes its keys/member instead of
  // hitting the unique constraint. The server-side scheduler (edge function,
  // service role) reads this table to deliver reminders when the app is closed.
  async savePushSubscription(householdId: string, userId: string, sub: PushSubscriptionInput): Promise<void> {
    const memberId = await this.memberIdFor(userId, householdId);
    const row: PushSubscriptionRow = {
      id: uid(),
      household_id: householdId,
      member_id: memberId,
      endpoint: sub.endpoint,
      p256dh: sub.p256dh,
      auth: sub.auth,
      created_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("push_subscriptions").upsert(row, { onConflict: "endpoint" });
    if (error) throw new Error(error.message);
  }

  async deletePushSubscription(endpoint: string): Promise<void> {
    const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
    if (error) throw new Error(error.message);
  }
}
