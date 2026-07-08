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
export type TaskCompletion = z.infer<typeof TaskCompletionSchema>;
export type Bundle = z.infer<typeof BundleSchema>;
export type ShoppingItem = z.infer<typeof ShoppingItemSchema>;
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
  doneAt?: string; // formatted time of the completion, e.g. "08:42"
  claimedBy?: string; // resolved member display name ("ik pak dit")
  dueHint?: string; // soft: "Waarschijnlijk weer toe" / "Nog even goed"
  dueDate?: string; // raw ISO, for the reminder engine — not for display
  wekkerLabel?: string; // soft, calm label: "wo 2 jul, 15:00" (one-off) or "Wekker om 09:00" (recurring)
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
export interface ShoppingItemView {
  id: string;
  title: string;
  quantity?: string;
  checked: boolean;
}

/** The shopping list split into open vs already-checked items, oldest-added first within each. */
export interface ShoppingListView {
  open: ShoppingItemView[];
  checked: ShoppingItemView[];
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
