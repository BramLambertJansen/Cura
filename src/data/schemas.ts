import { z } from "zod";

/**
 * DOMAIN SCHEMAS — the normalized, persisted truth.
 *
 * These describe what is *stored* (localStorage now, Supabase in Phase 3).
 * They are deliberately normalized and contain NO derived state:
 *   - A task's "done / doneBy / doneAt" is NOT here — it's derived from completions.
 *   - A room's task list and "due hint" is NOT here — derived from tasks + completions.
 *   - A routine's "11 of 14" density and hint text is NOT here — derived.
 *
 * Deriving (not storing) these is what keeps "the task is the single source of
 * truth" honest and lets the app degrade gracefully with partial data.
 * The screens consume the *view-models* in types.ts, produced by selectors.ts.
 */

const Id = z.string().min(1);
// ISO 8601 timestamp. `offset: true` is REQUIRED: local mode writes UTC via
// `.toISOString()` ("…Z"), but Postgres `timestamptz` comes back through
// PostgREST with a numeric offset ("…+00:00") — the strict default rejects the
// latter and every cloud task with a wekker would fail to load (dueDate).
const Iso = z.string().datetime({ offset: true });

// ─── Household & membership ─────────────────────────────────────────────────
// Many-to-many by design (multi-user ready). The "one household per user" cap
// is enforced in the APP layer (accept-invite), NOT by a unique constraint here.
// See CLAUDE.md §5.

export const HouseholdSchema = z.object({
  id: Id,
  name: z.string().min(1),
  // IANA timezone (e.g. "Europe/Amsterdam"). Drives WHEN a recurring wekker
  // fires: the in-app poller and the server-side push scheduler both compute
  // "today at HH:mm" in this zone, so their firedForKey matches exactly. Has a
  // default so pre-existing local snapshots keep loading (the field was added
  // with push notifications, migration 20260706000000_household_timezone.sql).
  timeZone: z.string().min(1).default("Europe/Amsterdam"),
});

const HHmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export const MemberSchema = z.object({
  id: Id,
  householdId: Id,
  displayName: z.string().min(1), // "Bram", "Stéphanie" — what the UI shows
  userId: Id.optional(), // links to an auth user in cloud mode; absent in local mode
  // Nightly window this member doesn't want to be pinged in. Both set = enabled;
  // either absent = off. Never drops the wekker itself — see reminders.ts
  // isWithinQuietHours, which just holds the ping back until the window ends.
  quietHoursStart: HHmm.optional(),
  quietHoursEnd: HHmm.optional(),
});

// Junction. No unique constraint on userId — the cap lives in the app layer.
export const HouseholdMemberSchema = z.object({
  userId: Id,
  householdId: Id,
});

export const HouseholdInviteSchema = z.object({
  token: Id,
  householdId: Id,
  createdById: Id,
  createdAt: Iso,
  expiresAt: Iso.optional(),
});

// ─── Rooms ───────────────────────────────────────────────────────────────────
// No taskIds (derived via task.roomId) and no hint (derived). `ownerId` is a
// SOFT preference — "meestal Bram" — never a hard assignment. Tasks stay a pool.

export const RoomSchema = z.object({
  id: Id,
  householdId: Id,
  name: z.string().min(1),
  iconKey: z.string().min(1), // maps to the UI icon set; data layer stays icon-agnostic
  color: z.string().min(1), // hex, drives the room accent
  ownerId: Id.optional(), // soft preferred owner, not an assignment
});

// ─── Tasks ─────────────────────────────────────────────────────────────────
// The single source of truth. NOTE what's absent: done / doneBy / doneAt.
// Completion is an event (see TaskCompletion), not a mutable flag on the task.

export const TaskSchema = z.object({
  id: Id,
  householdId: Id,
  roomId: Id.optional(),
  title: z.string().min(1),
  description: z.string().min(1).optional(), // free-form note, shown as a subtitle
  durationMin: z.number().int().positive().optional(), // view formats as "10 min"
  intervalDays: z.number().int().positive().optional(), // recurring rhythm; absent = one-off
  dueDate: Iso.optional(), // "wekker": one-off = exact deadline (date+time); recurring = only HH:mm is read (daily reminder time)
  bundleId: Id.optional(), // belongs to a routine bundle (a grouping, see below)
  claimedById: Id.optional(), // "ik pak dit" — optional, never required
  planned: z.boolean().default(false), // is it on today's plan?
});

// ─── Completions — the event layer ───────────────────────────────────────────
// Both VISIBILITY ("Stéphanie heeft de keuken gedaan") and routine DENSITY
// ("11 van de 14 ochtenden") are derived from these. Never store a rollup.

export const TaskCompletionSchema = z.object({
  id: Id,
  taskId: Id,
  completedById: Id,
  completedAt: Iso,
});

// ─── Bundles (routines) ──────────────────────────────────────────────────────
// A bundle is a VIEW/GROUPING of tasks (its tasks carry bundleId). It has NO
// own status: "routine done" is derived from its tasks' completions.
// `cadence` drives the density window (daily -> last N days, weekly -> last N weeks).
// `windowLabel` is display only ("ochtenden", "avonden", "weekenden").

export const BundleSchema = z.object({
  id: Id,
  householdId: Id,
  name: z.string().min(1),
  trigger: z.string().min(1), // "'s ochtends", "'s avonds", "Weekeinde" — display
  cadence: z.enum(["daily", "weekly"]),
  windowLabel: z.string().min(1),
});

// ─── Shopping list ───────────────────────────────────────────────────────────
// A plain checklist, deliberately NOT following the "no derived state" rule
// above: `checked` is a stored flag, not derived from an event log. Unlike a
// Task, a shopping item has no recurrence, no density/streak story, and never
// appears in the Samen visibility feed — it's a disposable list, not an
// activity log, so there's nothing worth event-sourcing (CLAUDE.md §5
// "Boodschappenlijst").

export const ShoppingItemSchema = z.object({
  id: Id,
  householdId: Id,
  title: z.string().min(1),
  quantity: z.string().min(1).optional(), // free text: "2", "1 pak" — no fixed unit, deliberately not a number
  checked: z.boolean().default(false),
  createdAt: Iso, // stable add-order
});

// ─── The whole persisted snapshot (what local mode reads/writes) ─────────────

export const DatabaseSchema = z.object({
  households: z.array(HouseholdSchema),
  members: z.array(MemberSchema),
  householdMembers: z.array(HouseholdMemberSchema),
  invites: z.array(HouseholdInviteSchema),
  rooms: z.array(RoomSchema),
  tasks: z.array(TaskSchema),
  completions: z.array(TaskCompletionSchema),
  bundles: z.array(BundleSchema),
  // Default so pre-existing local snapshots (before this field existed) keep
  // loading instead of getting reseeded — same reasoning as timeZone above.
  shoppingItems: z.array(ShoppingItemSchema).default([]),
});
