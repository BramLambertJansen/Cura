import { ZodError } from "zod";
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
interface TaskTemplateRow { title: string; description?: string; durationMin?: number; intervalDays?: number }
interface RoomRow { id: string; household_id: string; name: string; icon_key: string; color: string; quick_add_templates: TaskTemplateRow[] }
interface BundleRow { id: string; household_id: string; name: string; trigger: string; cadence: "daily" | "weekly"; window_label: string }
interface TaskRow {
  id: string; household_id: string; room_id: string | null; title: string;
  description: string | null;
  duration_min: number | null; interval_days: number | null; due_date: string | null;
  bundle_id: string | null; claimed_by_id: string | null; planned: boolean;
  started_at: string | null;
  checklist_items: { id: string; title: string; checked: boolean }[];
  picked_up_at: string | null;
  dagdeel: string | null;
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

/**
 * Runs a Schema.parse() call, turning a ZodError into a calm Dutch message
 * instead of letting its raw multi-line JSON issue dump reach a toast
 * verbatim (#195) — ZodError extends Error, so `e instanceof Error` alone
 * doesn't catch this upstream. Used by every mapXxx below, so it covers both
 * the tolerant bulk-list path (mapList still logs-and-skips the row, just
 * with a calmer message) and the strict single-row write path (the caller's
 * catch surfaces this message directly).
 */
function parseRow<T>(parse: () => T, label: string): T {
  try {
    return parse();
  } catch (e) {
    if (e instanceof ZodError) throw new Error(`Onverwachte data ontvangen bij ${label} — probeer het opnieuw.`);
    throw e;
  }
}

function mapHousehold(r: HouseholdRow): Household {
  return parseRow(() => HouseholdSchema.parse({ id: r.id, name: r.name, timeZone: r.time_zone }), "huishouden");
}
function mapMember(r: MemberRow): Member {
  return parseRow(() => MemberSchema.parse({
    id: r.id, householdId: r.household_id, displayName: r.display_name, userId: r.user_id ?? undefined,
    quietHoursStart: r.quiet_hours_start ?? undefined,
    quietHoursEnd: r.quiet_hours_end ?? undefined,
  }), "lid");
}
function mapInvite(r: InviteRow): HouseholdInvite {
  return parseRow(() => HouseholdInviteSchema.parse({
    token: r.token, householdId: r.household_id, createdById: r.created_by_id,
    createdAt: r.created_at, expiresAt: r.expires_at ?? undefined,
  }), "uitnodiging");
}
function mapRoom(r: RoomRow): Room {
  return parseRow(() => RoomSchema.parse({
    id: r.id, householdId: r.household_id, name: r.name, iconKey: r.icon_key, color: r.color,
    quickAddTemplates: r.quick_add_templates ?? [],
  }), "kamer");
}
function mapBundle(r: BundleRow): Bundle {
  return parseRow(() => BundleSchema.parse({ id: r.id, householdId: r.household_id, name: r.name, trigger: r.trigger, cadence: r.cadence, windowLabel: r.window_label }), "routine");
}
function mapTask(r: TaskRow): Task {
  return parseRow(() => TaskSchema.parse({
    id: r.id, householdId: r.household_id, roomId: r.room_id ?? undefined, title: r.title,
    description: r.description ?? undefined,
    durationMin: r.duration_min ?? undefined, intervalDays: r.interval_days ?? undefined,
    dueDate: r.due_date ?? undefined, bundleId: r.bundle_id ?? undefined,
    claimedById: r.claimed_by_id ?? undefined, planned: r.planned,
    pickedUpAt: r.picked_up_at ?? undefined,
    startedAt: r.started_at ?? undefined,
    checklistItems: r.checklist_items ?? [],
    dagdeel: (r.dagdeel as "ochtend" | "middag" | "avond" | null) ?? undefined,
  }), "taak");
}
function mapCompletion(r: CompletionRow): TaskCompletion {
  return parseRow(() => TaskCompletionSchema.parse({ id: r.id, taskId: r.task_id, completedById: r.completed_by_id, completedAt: r.completed_at }), "afronding");
}
function mapShoppingItem(r: ShoppingItemRow): ShoppingItem {
  return parseRow(() => ShoppingItemSchema.parse({
    id: r.id, householdId: r.household_id, title: r.title,
    quantity: r.quantity ?? undefined,
    amount: r.amount ?? undefined, unit: r.unit ?? undefined, description: r.description ?? undefined,
    category: r.category ?? undefined, checked: r.checked, createdAt: r.created_at,
  }), "boodschap");
}

// Optional shopping_items columns added after the initial table (category,
// then amount/unit/description) — since migrations apply manually and can lag
// behind deployed code, a request touching a not-yet-migrated column must
// degrade instead of throwing (same reasoning as the category column before it).
const NEW_SHOPPING_COLUMNS = ["category", "amount", "unit", "description"] as const;

/**
 * Which of NEW_SHOPPING_COLUMNS a PGRST204 "column not found" error is
 * actually naming — PostgREST reports one missing column per error, so this
 * is never more than one entry, but callers must re-check after each retry (a
 * second column can still be missing behind the first). NEVER used to justify
 * dropping the whole quartet for one column's absence — an earlier version of
 * this fallback did exactly that and would silently discard an already-set
 * category/amount/unit on an insert whose only real problem was a
 * still-missing description column (a deployment mid-migration-rollout). Same
 * pattern as missingTaskColumns below.
 */
export function missingShoppingColumns(error: unknown): (typeof NEW_SHOPPING_COLUMNS)[number][] {
  const err = error as { code?: string; message?: string } | null | undefined;
  if (err?.code !== "PGRST204" || typeof err.message !== "string" || !err.message.includes("'shopping_items'")) return [];
  const message = err.message;
  return NEW_SHOPPING_COLUMNS.filter((col) => message.includes(`'${col}'`));
}

export function isMissingShoppingColumn(error: unknown): boolean {
  return missingShoppingColumns(error).length > 0;
}

function withoutShoppingColumns<T extends Partial<Record<(typeof NEW_SHOPPING_COLUMNS)[number], unknown>>>(
  row: T,
  cols: readonly (typeof NEW_SHOPPING_COLUMNS)[number][],
): T {
  const clone = { ...row };
  for (const col of cols) delete clone[col];
  return clone;
}

// Optional tasks columns added after the initial table (started_at,
// checklist_items, picked_up_at) — since migrations apply manually and can lag
// behind deployed code, a request touching a not-yet-migrated column must
// degrade instead of throwing (same reasoning/pattern as the shopping_items
// columns above — kept as a second, table-scoped trio rather than a shared helper).
const NEW_TASK_COLUMNS = ["started_at", "checklist_items", "picked_up_at", "dagdeel"] as const;

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

// Optional rooms column added after the initial table (the household-managed
// "Snel toevoegen" override) — same manual-migration-can-lag reasoning/pattern
// as NEW_TASK_COLUMNS/NEW_SHOPPING_COLUMNS above, kept as its own
// table-scoped singleton rather than a shared helper.
const NEW_ROOM_COLUMNS = ["quick_add_templates"] as const;

export function missingRoomColumns(error: unknown): (typeof NEW_ROOM_COLUMNS)[number][] {
  const err = error as { code?: string; message?: string } | null | undefined;
  if (err?.code !== "PGRST204" || typeof err.message !== "string" || !err.message.includes("'rooms'")) return [];
  const message = err.message;
  return NEW_ROOM_COLUMNS.filter((col) => message.includes(`'${col}'`));
}

export function isMissingRoomColumn(error: unknown): boolean {
  return missingRoomColumns(error).length > 0;
}

function withoutRoomColumns<T extends Partial<Record<(typeof NEW_ROOM_COLUMNS)[number], unknown>>>(
  row: T,
  cols: readonly (typeof NEW_ROOM_COLUMNS)[number][],
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
      // Log the row's id (if it has one) and the error, never the full row —
      // it can carry real household PII (names, task titles/descriptions)
      // that has no reason to sit in browser devtools console history (#170).
      const id = (row as { id?: unknown } | null)?.id;
      // eslint-disable-next-line no-console
      console.error(`Overslaan van onleesbare ${label}-rij bij het laden`, id !== undefined ? { id } : "", e);
    }
  }
  return out;
}

/**
 * `cloud` mode: Supabase (Postgres + RLS + auth), CLAUDE.md §4 Phase 3.
 *
 * IMPORTANT: completed_by_id / claimed_by_id / created_by_id all
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
    // Routed through update_own_member (security definer), not a direct
    // .update() — RLS has no column granularity, so a plain "update your own
    // row" policy couldn't stop a caller also rewriting household_id on that
    // same row (#165). The RPC only ever targets auth.uid()'s own row and
    // only touches display_name/quiet_hours_*, so `memberId` (always the
    // caller's own id at every call site) isn't even sent.
    const setQuietHours = "quietHoursStart" in patch || "quietHoursEnd" in patch;
    const { data, error } = await supabase.rpc("update_own_member", {
      p_display_name: patch.displayName ?? null,
      p_set_quiet_hours: setQuietHours,
      p_quiet_hours_start: patch.quietHoursStart ?? null,
      p_quiet_hours_end: patch.quietHoursEnd ?? null,
    });
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
    // Routed through create_invite (security definer): created_at/expires_at
    // are derived from now() server-side, not trusted from the client, so a
    // direct insert can no longer set expires_at to null/years-out (#167).
    const { data, error } = await supabase.rpc("create_invite", { p_token: uid(), p_household_id: householdId });
    if (error || !data) throw new Error(error?.message ?? "Uitnodigen mislukt.");
    return mapInvite(data as InviteRow);
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

  async createRoom(householdId: string, room: Omit<Room, "id" | "householdId" | "quickAddTemplates"> & { quickAddTemplates?: Room["quickAddTemplates"] }): Promise<Room> {
    let row: RoomRow = {
      id: uid(), household_id: householdId, name: room.name, icon_key: room.iconKey,
      color: room.color, quick_add_templates: room.quickAddTemplates ?? [],
    };
    for (let attempt = 0; attempt <= NEW_ROOM_COLUMNS.length; attempt++) {
      const { error } = await supabase.from("rooms").insert(row);
      if (!error) return mapRoom(row);
      const missing = missingRoomColumns(error);
      if (missing.length === 0) throw new Error(error.message);
      row = withoutRoomColumns(row, missing);
    }
    throw new Error("Kamer aanmaken mislukt: onverwacht veel ontbrekende kolommen op 'rooms'.");
  }

  async updateRoom(roomId: string, patch: Partial<Omit<Room, "id" | "householdId">>): Promise<Room> {
    let update: Partial<RoomRow> = {};
    if (patch.name !== undefined) update.name = patch.name;
    if (patch.iconKey !== undefined) update.icon_key = patch.iconKey;
    if (patch.color !== undefined) update.color = patch.color;
    if (patch.quickAddTemplates !== undefined) update.quick_add_templates = patch.quickAddTemplates;
    for (let attempt = 0; attempt <= NEW_ROOM_COLUMNS.length; attempt++) {
      const { data, error } = await supabase.from("rooms").update(update).eq("id", roomId).select().single();
      if (!error) {
        if (!data) throw new Error(`Room not found: ${roomId}`);
        return mapRoom(data as RoomRow);
      }
      const missing = missingRoomColumns(error);
      if (missing.length === 0) throw new Error(error.message);
      update = withoutRoomColumns(update, missing);
    }
    throw new Error("Kamer bijwerken mislukt: onverwacht veel ontbrekende kolommen op 'rooms'.");
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
      dagdeel: input.dagdeel ?? null,
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
    if ("dagdeel" in patch) update.dagdeel = patch.dagdeel ?? null;
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
      let query = supabase.from("tasks").update(update).eq("id", taskId);
      // Guard against a claim race (#191): only claim a task that's still
      // unclaimed. Releasing (claimedById === null) always succeeds regardless
      // of who currently holds it. `.maybeSingle()` (not `.single()`) so a
      // race that matches zero rows comes back as `data: null` instead of a
      // thrown PostgREST error we'd have to pattern-match.
      if (claimedById) query = query.is("claimed_by_id", null);
      const { data, error } = await query.select().maybeSingle();
      if (!error) {
        if (!data) throw new Error(claimedById ? "Iemand anders pakte dit al op." : `Task not found: ${taskId}`);
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
    if (taskError || !taskData) throw new Error("Deze taak bestaat niet meer.");
    const memberId = await this.memberIdFor(userId, (taskData as { household_id: string }).household_id);
    const row: CompletionRow = { id: uid(), task_id: taskId, completed_by_id: memberId, completed_at: new Date().toISOString() };
    const { error } = await supabase.from("task_completions").insert(row);
    if (error) {
      // 23503 = FK violation: a housemate deleted this task in the window
      // between our SELECT above and this INSERT. Same calm message as the
      // not-found case above, not the raw Postgres constraint text (#195).
      throw new Error(error.code === "23503" ? "Deze taak bestaat niet meer." : error.message);
    }
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
    // mapList, not a raw .map — one shopping item with an unparseable row
    // (e.g. a legacy timestamp format) must not brick init() for the whole
    // household, same as every other bulk list here (#187, the #54 bugclass).
    return mapList((data ?? []) as ShoppingItemRow[], mapShoppingItem, "boodschap");
  }

  async createShoppingItem(householdId: string, input: CreateShoppingItemInput): Promise<ShoppingItem> {
    let row: ShoppingItemRow = {
      id: uid(), household_id: householdId, title: input.title,
      quantity: null,
      amount: input.amount ?? null, unit: input.unit ?? null, description: input.description ?? null,
      category: input.category ?? null, checked: false, created_at: new Date().toISOString(),
    };
    // Each retry drops only the column(s) THIS error actually named — never
    // the whole NEW_SHOPPING_COLUMNS quartet — so a lone still-missing column
    // never takes an already-migrated sibling with it. Bounded by
    // NEW_SHOPPING_COLUMNS.length since a retry can reveal at most one new
    // missing column per attempt.
    for (let attempt = 0; attempt <= NEW_SHOPPING_COLUMNS.length; attempt++) {
      const { error } = await supabase.from("shopping_items").insert(row);
      if (!error) return mapShoppingItem(row);
      const missing = missingShoppingColumns(error);
      if (missing.length === 0) throw new Error(error.message);
      row = withoutShoppingColumns(row, missing);
    }
    throw new Error("Boodschap aanmaken mislukt: onverwacht veel ontbrekende kolommen op 'shopping_items'.");
  }

  async updateShoppingItem(itemId: string, patch: UpdateShoppingItemInput): Promise<ShoppingItem> {
    let update = shoppingItemUpdateRow(patch);
    for (let attempt = 0; attempt <= NEW_SHOPPING_COLUMNS.length; attempt++) {
      const query = Object.keys(update).length > 0
        ? supabase.from("shopping_items").update(update).eq("id", itemId).select().single()
        : supabase.from("shopping_items").select("*").eq("id", itemId).single();
      const { data, error } = await query;
      if (!error) {
        if (!data) throw new Error(`Shopping item not found: ${itemId}`);
        return mapShoppingItem(data as ShoppingItemRow);
      }
      const missing = missingShoppingColumns(error);
      if (missing.length === 0) throw new Error(error.message);
      update = withoutShoppingColumns(update, missing);
    }
    throw new Error("Boodschap bijwerken mislukt: onverwacht veel ontbrekende kolommen op 'shopping_items'.");
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
  subscribeToChanges(householdId: string, onChange: (table: string) => void): () => void {
    let stopped = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      channel = supabase
        .channel(`household-${householdId}`)
        // Each handler names its own table (#174) so the caller can refetch
        // only the affected list instead of all six on every remote write.
        .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `household_id=eq.${householdId}` }, () => onChange("tasks"))
        .on("postgres_changes", { event: "*", schema: "public", table: "rooms", filter: `household_id=eq.${householdId}` }, () => onChange("rooms"))
        .on("postgres_changes", { event: "*", schema: "public", table: "bundles", filter: `household_id=eq.${householdId}` }, () => onChange("bundles"))
        .on("postgres_changes", { event: "*", schema: "public", table: "members", filter: `household_id=eq.${householdId}` }, () => onChange("members"))
        .on("postgres_changes", { event: "*", schema: "public", table: "shopping_items", filter: `household_id=eq.${householdId}` }, () => onChange("shopping_items"))
        .on("postgres_changes", { event: "*", schema: "public", table: "task_completions" }, () => onChange("task_completions"))
        .subscribe((status) => {
          // A channel that errors or times out would otherwise leave this
          // household silently stuck on stale data until a manual
          // pull-to-refresh or app reload (#197) — self-heal by reconnecting
          // rather than relying only on realtime-js's own retry behaviour.
          if (stopped || (status !== "CHANNEL_ERROR" && status !== "TIMED_OUT") || reconnectTimer) return;
          reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            if (stopped) return;
            if (channel) void supabase.removeChannel(channel);
            connect();
          }, 2000);
        });
    };
    connect();

    return () => {
      stopped = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (channel) void supabase.removeChannel(channel);
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
