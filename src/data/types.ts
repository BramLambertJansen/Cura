import { z } from "zod";
import {
  HouseholdSchema,
  MemberSchema,
  HouseholdMemberSchema,
  HouseholdInviteSchema,
  RoomSchema,
  TaskSchema,
  ChecklistItemSchema,
  TaskCompletionSchema,
  BundleSchema,
  ShoppingItemSchema,
  ShoppingUnitSchema,
  DatabaseSchema,
} from "./schemas";

/**
 * TYPES — two layers.
 *
 * 1. DOMAIN types: inferred straight from the Zod schemas. These are the
 *    normalized, persisted entities. Feature code reads/writes these via the
 *    DataStore (store.ts).
 *
 * 2. VIEW-MODEL types: what the screens actually render. They mirror the shapes
 *    the Figma Make design already uses (Task with done/doneBy, Room with its
 *    tasks + hint, Routine with "11 of 14" density) — so the design stays the
 *    lead and screens barely change. These are PRODUCED by selectors.ts from
 *    domain entities + completions; they are never stored.
 */

// ─── Domain (persisted) ──────────────────────────────────────────────────────

export type Household = z.infer<typeof HouseholdSchema>;
export type Member = z.infer<typeof MemberSchema>;
export type HouseholdMember = z.infer<typeof HouseholdMemberSchema>;
export type HouseholdInvite = z.infer<typeof HouseholdInviteSchema>;
export type Room = z.infer<typeof RoomSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type ChecklistItem = z.infer<typeof ChecklistItemSchema>;
export type TaskCompletion = z.infer<typeof TaskCompletionSchema>;
export type Bundle = z.infer<typeof BundleSchema>;
export type ShoppingItem = z.infer<typeof ShoppingItemSchema>;
export type ShoppingUnitKey = z.infer<typeof ShoppingUnitSchema>;
export type Database = z.infer<typeof DatabaseSchema>;

// ─── View-models (derived, what screens consume) ─────────────────────────────

/**
 * A task as a screen sees it. `done`/`doneBy`/`doneAt` are derived from the
 * latest relevant completion; `dueHint` is a SOFT phrase derived from interval
 * + last completion — never an exact "5 dagen geleden". `claimedBy`/`room` are
 * resolved to display names.
 */
export interface TaskView {
  id: string;
  title: string;
  description?: string; // free-form note, shown as a subtitle
  room?: string; // resolved room name
  roomId?: string;
  duration?: string; // formatted, e.g. "10 min"
  durationMin?: number; // raw minutes, for the edit form — not for display
  intervalDays?: number; // for the interval-hint badge, e.g. "Wekelijks"
  planned: boolean;
  done: boolean; // derived: completed within the current cycle
  doneBy?: string; // resolved member display name
  doneById?: string; // raw member id, for "is this mine?" checks — never displayed
  doneAt?: string; // formatted time of the completion, e.g. "08:42"
  claimedBy?: string; // resolved member display name ("ik pak dit")
  claimedById?: string; // raw member id, for the "wie pakt dit op?"-picker and "is this mine?" checks — never displayed
  pickedUpAt?: string; // raw ISO, set only by the Huis pool-claim action — for splitPickedUpToday's "Vandaag opgepakt" grouping, not for display
  dueHint?: string; // soft: "Waarschijnlijk weer toe" / "Nog even goed"
  dueDate?: string; // raw ISO, for the reminder engine — not for display
  wekkerLabel?: string; // soft, calm label: "wo 2 jul, 15:00" (one-off) or "Wekker om 09:00" (recurring)
  startedAt?: string; // raw ISO, for the edit form's manual "Gestart" toggle — not for display
  /** Derived status label: done -> "klaar"; startedAt set -> "bezig"; else "open" ("niet gestart"). Never stored. */
  status: "open" | "bezig" | "klaar";
  /** Direct pass-through of the domain checklist — no resolution step needed (no names to look up). */
  checklistItems: ChecklistItem[];
  /** undefined when the task has no checklist at all, so badge call-sites can just check truthiness. */
  checklistProgress?: { done: number; total: number };
}

/**
 * Open tasks bucketed by their date status, for the Takenoverzicht screen.
 * All four groups hold only open (`!done`) tasks; the split is a pure derivation
 * from `dueDate` + `intervalDays` (see `toTaskOverview`) — no stored status,
 * no alarming "achterstallig" framing (CLAUDE.md §2).
 */
export interface TaskOverview {
  overdue: TaskView[]; // one-off, dueDate in the past — "Al even blijven liggen"
  recurring: TaskView[]; // every open recurring task (open ⟹ due again) — "Waarschijnlijk weer toe"
  upcoming: TaskView[]; // one-off, dueDate now or later — "In de toekomst"
  undated: TaskView[]; // one-off without a wekker — the dateless pool
}

/**
 * Open tasks grouped into a soft dagdeel timeline for Vandaag's Tijdlijn-lay-out.
 * Only a task that actually carries a wekker/dueDate gets assigned to Ochtend/
 * Middag/Avond (derived from that real time); every other open task lands in
 * `overig` rather than being assigned a moment it has no signal for (CLAUDE.md
 * §2: honesty over precision). Groups with no tasks are omitted by the selector.
 */
export interface DagdeelGroup {
  key: "ochtend" | "middag" | "avond" | "overig";
  label: string;
  tasks: TaskView[];
}

/** A room with its pooled tasks and a soft, honest hint. */
export interface RoomView {
  id: string;
  name: string;
  iconKey: string;
  color: string;
  owner?: string; // resolved soft owner name
  ownerId?: string; // raw member id, for the edit form — not for display
  tasks: TaskView[];
  openCount: number;
  hint: string; // soft: "Waarschijnlijk weer toe aan een beurt" / "Nog even goed"
}

/**
 * A routine with soft, rolling density — NEVER a streak.
 * `doneInWindow` / `windowSize` express the ratio ("11 van de 14 ochtenden");
 * a missed period is just a dip, never a reset. `hint` is the qualitative line.
 */
export interface RoutineView {
  id: string;
  name: string;
  trigger: string;
  tasks: TaskView[];
  doneInWindow: number;
  windowSize: number;
  windowLabel: string; // "ochtenden", "avonden", "weekenden"
  hint: string; // "Zit lekker in je ritme" / "Glipt er de laatste tijd uit"
}

/** A shopping item as a screen sees it — a plain checklist row, no dueHint/density story. */
export type ShoppingCategoryKey = "fresh" | "cold" | "pantry" | "household" | "other";

export interface ShoppingCategoryView {
  key: ShoppingCategoryKey;
  label: string;
  items: ShoppingItemView[];
}

export interface ShoppingItemView {
  id: string;
  title: string;
  amount?: number;
  unit?: ShoppingUnitKey;
  /** Compact display label ("500ml", "1kg", "3x") — derived from amount+unit, or the legacy free-text quantity for older rows. Absent for a bare single "stuks" item. */
  quantity?: string;
  description?: string;
  checked: boolean;
  category: ShoppingCategoryKey;
}

/** The shopping list split into open vs already-checked items, oldest-added first within each. */
export interface ShoppingListView {
  open: ShoppingItemView[];
  checked: ShoppingItemView[];
  openGroups: ShoppingCategoryView[];
}

/** One line for the Samen (visibility) feed — a message, not a scoreboard. */
export interface ActivityView {
  taskId: string;
  title: string;
  room?: string;
  doneBy: string; // resolved member display name
  doneById?: string; // raw member id, for "is this mine?" checks — never displayed
  doneAt: string; // ISO; the view formats it
}
