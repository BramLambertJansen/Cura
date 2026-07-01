import type {
  Household,
  Member,
  HouseholdInvite,
  Room,
  Task,
  TaskCompletion,
  Bundle,
} from "./types";

/**
 * THE DATA LAYER — one typed interface, swappable backends.
 *
 * Feature code talks ONLY to this interface. It never imports localStorage or
 * Supabase directly. That's what lets Phases 1–2 run with no backend and Phase 3
 * add Supabase without touching feature code (CLAUDE.md §4).
 *
 * Backends:
 *   local  -> localStorage, single implicit household, solo. Phases 1–2.
 *   cloud  -> Supabase (auth, RLS, realtime). Phase 3+.
 * Selected by VITE_DATA_MODE.
 *
 * Returns the DOMAIN entities (normalized). The screens render VIEW-MODELS,
 * produced by selectors.ts from these — the store does not derive done/density/hints.
 */

export type DataMode = "local" | "cloud";

export interface CreateTaskInput {
  title: string;
  description?: string;
  roomId?: string;
  durationMin?: number;
  intervalDays?: number;
  dueDate?: string; // ISO; one-off = full deadline (date+time); recurring = only HH:mm is read
  bundleId?: string;
  planned?: boolean;
}

export interface DataStore {
  readonly mode: DataMode;

  // ── Identity ───────────────────────────────────────────────────────────────
  /** The acting user. In local mode this is a fixed implicit user. */
  currentUserId(): Promise<string>;

  // ── Households ──────────────────────────────────────────────────────────────
  /**
   * Returns a LIST even though it's always length 1 for now. Do NOT collapse this
   * to a single household in return types — the one-household cap is a UI/guard
   * decision (see acceptInvite), not a data-shape assumption. This is what keeps
   * "multiple households later" a UI change, not a rewrite (CLAUDE.md §5).
   */
  getHouseholdsForUser(userId: string): Promise<Household[]>;
  listMembers(householdId: string): Promise<Member[]>;
  /** Renames the acting member (their own display name only). */
  updateMember(memberId: string, patch: { displayName: string }): Promise<Member>;
  /**
   * "Create your first household" onboarding — for a signed-in user with zero
   * households. Atomically creates the household, the creator's member row,
   * and household membership. Disabled in local mode (always exactly one).
   */
  createHousehold(name: string): Promise<Household>;
  /** Renames the household. Disabled in local mode (there's nothing to sync the rename to). */
  updateHousehold(householdId: string, name: string): Promise<Household>;

  // ── Invites ──────────────────────────────────────────────────────────────────
  // Disabled in local mode (single-device). Implementations should throw a clear,
  // catchable error there so the UI can hide/disable the invite affordance.
  createInvite(householdId: string): Promise<HouseholdInvite>;
  /**
   * THE ONE-HOUSEHOLD CAP LIVES HERE. While the cap is on, reject acceptance if
   * the user already belongs to a household — return a typed "already a member"
   * result rather than silently adding a second. Removing the cap later is one
   * line, not a migration.
   */
  acceptInvite(token: string, userId: string): Promise<{ ok: true } | { ok: false; reason: "already_member" | "invalid" | "expired" }>;
  /** Revokes a not-yet-accepted invite so its link stops working. Disabled in local mode. */
  revokeInvite(token: string): Promise<void>;

  // ── Rooms ────────────────────────────────────────────────────────────────────
  listRooms(householdId: string): Promise<Room[]>;
  createRoom(householdId: string, room: Omit<Room, "id" | "householdId">): Promise<Room>;
  updateRoom(roomId: string, patch: Partial<Omit<Room, "id" | "householdId">>): Promise<Room>;
  deleteRoom(roomId: string): Promise<void>;

  // ── Tasks ──────────────────────────────────────────────────────────────────
  listTasks(householdId: string): Promise<Task[]>;
  createTask(householdId: string, input: CreateTaskInput): Promise<Task>;
  updateTask(taskId: string, patch: Partial<CreateTaskInput>): Promise<Task>;
  deleteTask(taskId: string): Promise<void>;
  /** "Ik pak dit" — optional, reversible. Pass null to release. */
  claimTask(taskId: string, userId: string | null): Promise<Task>;

  // ── Completions (the core interaction + the event layer) ─────────────────────
  /** One tap to complete. Writes an event; done/visibility/density derive from it. */
  completeTask(taskId: string, userId: string): Promise<TaskCompletion>;
  /** Undo the most recent completion of a task (gentle, no penalty). */
  uncompleteTask(taskId: string): Promise<void>;
  /** All completions for the household; pass `since` to bound the Samen feed / density window. */
  listCompletions(householdId: string, since?: string): Promise<TaskCompletion[]>;

  // ── Bundles (routines) ────────────────────────────────────────────────────────
  listBundles(householdId: string): Promise<Bundle[]>;
  createBundle(householdId: string, bundle: Omit<Bundle, "id" | "householdId">): Promise<Bundle>;
  updateBundle(bundleId: string, patch: Partial<Omit<Bundle, "id" | "householdId">>): Promise<Bundle>;
  deleteBundle(bundleId: string): Promise<void>;
}

/**
 * Resolve the active mode. Defaults to local so Phases 1–2 "just work".
 */
export function resolveDataMode(): DataMode {
  const m = import.meta.env.VITE_DATA_MODE;
  return m === "cloud" ? "cloud" : "local";
}

/**
 * Factory. Wire the implementations as they're built:
 *   local -> new LocalStore()      (Phase 1 — localStorage, seed.ts for first run)
 *   cloud -> new SupabaseStore()   (Phase 3 — auth, RLS, realtime)
 *
 * Both must satisfy DataStore and validate I/O against the Zod schemas at the
 * boundary. Keeping the factory the only construction point means feature code
 * never learns which backend it's on.
 */
export async function createDataStore(): Promise<DataStore> {
  const mode = resolveDataMode();
  switch (mode) {
    case "local": {
      const { LocalStore } = await import("./local/localStore");
      return new LocalStore();
    }
    case "cloud": {
      const { SupabaseStore } = await import("./cloud/supabaseStore");
      return new SupabaseStore();
    }
  }
}
