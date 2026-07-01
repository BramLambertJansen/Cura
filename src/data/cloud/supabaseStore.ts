import { supabase } from "./supabaseClient";
import type { CreateTaskInput, DataStore } from "../store";
import type { Household, HouseholdInvite, Member, Room, Task, TaskCompletion, Bundle } from "../types";
import {
  HouseholdSchema,
  MemberSchema,
  HouseholdInviteSchema,
  RoomSchema,
  TaskSchema,
  TaskCompletionSchema,
  BundleSchema,
} from "../schemas";

const uid = (): string => crypto.randomUUID();

// Hand-written row shapes, matching supabase/migrations/20260630000000_init.sql
// column-for-column — no live DB access in this sandbox to generate types.

interface HouseholdRow { id: string; name: string }
interface MemberRow { id: string; household_id: string; display_name: string; user_id: string | null }
interface InviteRow { token: string; household_id: string; created_by_id: string; created_at: string; expires_at: string | null }
interface RoomRow { id: string; household_id: string; name: string; icon_key: string; color: string; owner_id: string | null }
interface BundleRow { id: string; household_id: string; name: string; trigger: string; cadence: "daily" | "weekly"; window_label: string }
interface TaskRow {
  id: string; household_id: string; room_id: string | null; title: string;
  description: string | null;
  duration_min: number | null; interval_days: number | null; due_date: string | null;
  bundle_id: string | null; claimed_by_id: string | null; planned: boolean;
}
interface CompletionRow { id: string; task_id: string; completed_by_id: string; completed_at: string }

function mapHousehold(r: HouseholdRow): Household {
  return HouseholdSchema.parse({ id: r.id, name: r.name });
}
function mapMember(r: MemberRow): Member {
  return MemberSchema.parse({ id: r.id, householdId: r.household_id, displayName: r.display_name, userId: r.user_id ?? undefined });
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
  });
}
function mapCompletion(r: CompletionRow): TaskCompletion {
  return TaskCompletionSchema.parse({ id: r.id, taskId: r.task_id, completedById: r.completed_by_id, completedAt: r.completed_at });
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
      .select("households(id, name)")
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as unknown as { households: HouseholdRow | null }[];
    return rows.filter((r) => r.households).map((r) => mapHousehold(r.households!));
  }

  async listMembers(householdId: string): Promise<Member[]> {
    const { data, error } = await supabase.from("members").select("*").eq("household_id", householdId);
    if (error) throw new Error(error.message);
    return ((data ?? []) as MemberRow[]).map(mapMember);
  }

  async updateMember(memberId: string, patch: { displayName: string }): Promise<Member> {
    const { data, error } = await supabase.from("members").update({ display_name: patch.displayName }).eq("id", memberId).select().single();
    if (error || !data) throw new Error(error?.message ?? `Member not found: ${memberId}`);
    return mapMember(data as MemberRow);
  }

  async createHousehold(name: string): Promise<Household> {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw new Error("Niet ingelogd.");
    const displayName = (userData.user.user_metadata?.displayName as string | undefined) ?? "Ik";
    const householdId = uid();
    const memberId = uid();
    const { error } = await supabase.rpc("create_household", {
      p_household_id: householdId,
      p_household_name: name,
      p_member_id: memberId,
      p_display_name: displayName,
    });
    if (error) throw new Error(error.message);
    return mapHousehold({ id: householdId, name });
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
    const displayName = (userData.user.user_metadata?.displayName as string | undefined) ?? "Ik";
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
    return ((data ?? []) as RoomRow[]).map(mapRoom);
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
    return ((data ?? []) as TaskRow[]).map(mapTask);
  }

  async createTask(householdId: string, input: CreateTaskInput): Promise<Task> {
    const row: TaskRow = {
      id: uid(), household_id: householdId, room_id: input.roomId ?? null, title: input.title,
      description: input.description ?? null,
      duration_min: input.durationMin ?? null, interval_days: input.intervalDays ?? null,
      due_date: input.dueDate ?? null, bundle_id: input.bundleId ?? null,
      claimed_by_id: null, planned: input.planned ?? false,
    };
    const { error } = await supabase.from("tasks").insert(row);
    if (error) throw new Error(error.message);
    return mapTask(row);
  }

  async updateTask(taskId: string, patch: Partial<CreateTaskInput>): Promise<Task> {
    const update: Partial<TaskRow> = {};
    if (patch.title !== undefined) update.title = patch.title;
    if (patch.description !== undefined) update.description = patch.description ?? null;
    if (patch.roomId !== undefined) update.room_id = patch.roomId ?? null;
    if (patch.durationMin !== undefined) update.duration_min = patch.durationMin ?? null;
    if (patch.intervalDays !== undefined) update.interval_days = patch.intervalDays ?? null;
    if (patch.dueDate !== undefined) update.due_date = patch.dueDate ?? null;
    if (patch.bundleId !== undefined) update.bundle_id = patch.bundleId ?? null;
    if (patch.planned !== undefined) update.planned = patch.planned;
    const { data, error } = await supabase.from("tasks").update(update).eq("id", taskId).select().single();
    if (error || !data) throw new Error(error?.message ?? `Task not found: ${taskId}`);
    return mapTask(data as TaskRow);
  }

  async deleteTask(taskId: string): Promise<void> {
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);
    if (error) throw new Error(error.message);
  }

  async claimTask(taskId: string, userId: string | null): Promise<Task> {
    let claimedById: string | null = null;
    if (userId) {
      const { data: taskData, error: taskError } = await supabase.from("tasks").select("household_id").eq("id", taskId).single();
      if (taskError || !taskData) throw new Error(`Task not found: ${taskId}`);
      claimedById = await this.memberIdFor(userId, (taskData as { household_id: string }).household_id);
    }
    const { data, error } = await supabase.from("tasks").update({ claimed_by_id: claimedById }).eq("id", taskId).select().single();
    if (error || !data) throw new Error(error?.message ?? `Task not found: ${taskId}`);
    return mapTask(data as TaskRow);
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
    return ((data ?? []) as unknown as CompletionRow[]).map(mapCompletion);
  }

  // ── Bundles ──────────────────────────────────────────────────────────────
  async listBundles(householdId: string): Promise<Bundle[]> {
    const { data, error } = await supabase.from("bundles").select("*").eq("household_id", householdId);
    if (error) throw new Error(error.message);
    return ((data ?? []) as BundleRow[]).map(mapBundle);
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

  // ── Realtime (Phase 3+) ──────────────────────────────────────────────────
  // One channel per household, subscribed to every table the household view
  // depends on. tasks/rooms/bundles/members carry household_id and are
  // filtered server-side; task_completions has no household_id of its own
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
      .on("postgres_changes", { event: "*", schema: "public", table: "task_completions" }, onChange)
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }
}
