import type {
  Household,
  Member,
  HouseholdInvite,
  Room,
  Task,
  ChecklistItem,
  TaskTemplate,
  TaskCompletion,
  Bundle,
  ShoppingItem,
  ShoppingCategoryKey,
  ShoppingUnitKey,
  TaskSuggestion,
  McpAccessToken,
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
  dagdeel?: "ochtend" | "middag" | "avond"; // optional "Wanneer"-tag, independent of dueDate/wekker
  bundleId?: string;
  planned?: boolean;
  startedAt?: string; // manual "Gestart" toggle; ISO or undefined-to-clear
  checklistItems?: ChecklistItem[]; // omitted/undefined treated as [] by both backends
}

export interface CreateShoppingItemInput {
  title: string;
  amount?: number;
  unit?: ShoppingUnitKey;
  description?: string;
  category?: ShoppingCategoryKey;
}

export interface UpdateShoppingItemInput {
  title?: string;
  amount?: number;
  unit?: ShoppingUnitKey;
  description?: string;
  category?: ShoppingCategoryKey;
}

export function normalizeShoppingItemPatch(patch: UpdateShoppingItemInput): UpdateShoppingItemInput {
  const normalized: UpdateShoppingItemInput = {};
  if (patch.title !== undefined) normalized.title = patch.title.trim();
  if ("amount" in patch) normalized.amount = patch.amount;
  if ("unit" in patch) normalized.unit = patch.unit;
  if ("description" in patch) {
    const description = patch.description?.trim();
    normalized.description = description || undefined;
  }
  if (patch.category !== undefined) normalized.category = patch.category;
  return normalized;
}

/**
 * A browser Web Push subscription, flattened to the fields the server needs to
 * send a VAPID-signed push (endpoint + the two encryption keys). Produced from
 * `PushSubscription.toJSON()` on the client (see usePushSubscription).
 */
export interface PushSubscriptionInput {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/**
 * Result of minting a new MCP access token. `rawToken` is the actual secret
 * to paste into an external Claude's MCP config — it is returned ONLY this
 * one time (only its hash is ever persisted, server-side) and can never be
 * retrieved again after this call returns.
 */
export interface McpTokenCreated {
  token: McpAccessToken;
  rawToken: string;
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
  /**
   * Updates the acting member's own settings — display name and/or quiet
   * hours. Only provided fields are touched; pass `null` for a quiet-hours
   * bound to clear it (both must be cleared together to turn quiet hours off).
   */
  updateMember(
    memberId: string,
    patch: { displayName?: string; quietHoursStart?: string | null; quietHoursEnd?: string | null },
  ): Promise<Member>;
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
  acceptInvite(token: string): Promise<{ ok: true } | { ok: false; reason: "already_member" | "invalid" | "expired" }>;
  /** Revokes a not-yet-accepted invite so its link stops working. Disabled in local mode. */
  revokeInvite(token: string): Promise<void>;

  // ── Rooms ────────────────────────────────────────────────────────────────────
  listRooms(householdId: string): Promise<Room[]>;
  // quickAddTemplates omitted/undefined treated as [] by both backends (same
  // precedent as CreateTaskInput.checklistItems above) — a room's "Snel
  // toevoegen" override starts empty until managed via EditRoomSheet.
  createRoom(householdId: string, room: Omit<Room, "id" | "householdId" | "quickAddTemplates"> & { quickAddTemplates?: TaskTemplate[] }): Promise<Room>;
  updateRoom(roomId: string, patch: Partial<Omit<Room, "id" | "householdId">>): Promise<Room>;
  deleteRoom(roomId: string): Promise<void>;

  // ── Tasks ──────────────────────────────────────────────────────────────────
  listTasks(householdId: string): Promise<Task[]>;
  createTask(householdId: string, input: CreateTaskInput): Promise<Task>;
  updateTask(taskId: string, patch: Partial<CreateTaskInput>): Promise<Task>;
  deleteTask(taskId: string): Promise<void>;
  /**
   * "Ik pak dit" — optional, reversible. Pass null to release.
   * `trackPickup`: stamp `pickedUpAt` when claiming — reserved for the
   * explicit Huis pool-claim action (useCuraStore's top-level `claimTask`).
   * The generic planned-auto-claim inside createTask/updateTask always omits
   * it, so a task planned from Vandaag (AddTaskSheet/EditTaskSheet/
   * SuggestieRij) never misreads as "picked up from Huis".
   */
  claimTask(taskId: string, userId: string | null, trackPickup?: boolean): Promise<Task>;
  /**
   * Assign a task directly to a household member by their `members.id` (or
   * null to clear) — the "Wie pakt dit op?"-picker's counterpart to claimTask.
   * Unlike claimTask, `memberId` is already a members.id, not an auth uid, so
   * it can target ANY member — including one without a linked auth account
   * (e.g. local mode's second, demo-only housemate) — and either housemate
   * can assign the task to the other, not just to themselves. Never stamps
   * pickedUpAt (that's reserved for the explicit Huis pool-claim action).
   */
  assignTask(taskId: string, memberId: string | null): Promise<Task>;

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

  // ── Shopping list ──────────────────────────────────────────────────────────
  // Purpose-specific methods (mirrors claimTask/completeTask) rather than a
  // generic patch — `checked` is the only mutable field besides the item itself.
  listShoppingItems(householdId: string): Promise<ShoppingItem[]>;
  createShoppingItem(householdId: string, input: CreateShoppingItemInput): Promise<ShoppingItem>;
  updateShoppingItem(itemId: string, patch: UpdateShoppingItemInput): Promise<ShoppingItem>;
  toggleShoppingItem(itemId: string, checked: boolean): Promise<ShoppingItem>;
  deleteShoppingItem(itemId: string): Promise<void>;

  /**
   * Live updates for this household (tasks, task_completions, rooms, bundles,
   * members, shopping_items) — cloud-only (Phase 3+ Realtime). `onChange` fires
   * once per remote change event, naming the Postgres table that changed, so
   * the caller can refetch only what's actually affected (#174) instead of
   * every list on every write. Returns an unsubscribe function. A no-op in
   * local mode (single device, nothing to subscribe to) so callers never need
   * to branch on `store.mode`.
   */
  subscribeToChanges(householdId: string, onChange: (table: string) => void): () => void;

  // ── Web Push subscriptions (cloud-only) ──────────────────────────────────
  // The server-side scheduler reads these to deliver wekker-reminders when the
  // app is closed. No-ops in local mode (single device, no server to push
  // from) so callers never branch on `store.mode`. Upserts on endpoint so
  // re-subscribing the same browser refreshes its keys rather than duplicating.
  savePushSubscription(householdId: string, userId: string, sub: PushSubscriptionInput): Promise<void>;
  /** Remove a subscription by its endpoint (e.g. the user turned meldingen off, or it expired). */
  deletePushSubscription(endpoint: string): Promise<void>;

  // ── AI-voorstellen (Phase 4, MCP — CLAUDE.md §5 "AI-voorstellen") ────────
  /**
   * Pending suggestions from an externally-connected Claude (via the
   * mcp-server edge function). Always [] in local mode — there is never an
   * MCP koppeling without a deployed cloud backend to call.
   */
  listTaskSuggestions(householdId: string): Promise<TaskSuggestion[]>;
  /**
   * Removes a suggestion outright — there is no archived/"dismissed" third
   * state, the row's existence IS "pending" (see TaskSuggestionSchema).
   * Used directly for "afwijzen". For "accepteren", this is called FIRST
   * (claiming the row) and createTask only runs if it returns true — review
   * finding: create-then-delete let two concurrent accepts (or a retry after
   * a failed delete) both create a task before either delete landed. Resolves
   * `true` if this call actually removed the row, `false` if it was already
   * gone (a race with another accept/dismiss, e.g. a housemate acting on the
   * same suggestion, or a stale local list) — the caller must treat `false`
   * as "already resolved elsewhere", never retry the delete or proceed.
   */
  deleteTaskSuggestion(id: string): Promise<boolean>;

  // ── MCP access tokens (cloud-only) ───────────────────────────────────────
  // Disabled in local mode (no deployed server for an external Claude to
  // call) — implementations should throw a clear, catchable error there,
  // same as createInvite/revokeInvite.
  listMcpTokens(householdId: string): Promise<McpAccessToken[]>;
  createMcpToken(householdId: string, label: string): Promise<McpTokenCreated>;
  /** Soft-revoke (sets revokedAt) — never a delete, so attribution on suggestions this token already made stays truthful. */
  revokeMcpToken(tokenId: string): Promise<void>;
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
