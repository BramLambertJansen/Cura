import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useCuraStore } from "../../stores/useCuraStore";
import { buildLatestCompletionMap, getDueReminders } from "../../data/selectors";

const POLL_MS = 30_000;
const NOTIF_PREF_KEY = "cura:notif-pref";
const FIRED_STORAGE_KEY = "cura:fired-reminders";
const PRUNE_AFTER_MS = 24 * 60 * 60 * 1000; // 1 day — matches getDueReminders' own one-off lookback window

function dispatchReminder(title: string) {
  const userDisabled = localStorage.getItem(NOTIF_PREF_KEY) === "disabled";
  if (
    !userDisabled &&
    typeof Notification !== "undefined" &&
    Notification.permission === "granted"
  ) {
    new Notification(`Tijd voor: ${title}`, { body: "Je hebt dit op de planning staan." });
  } else {
    toast(`Wekker: ${title}`, { description: "Tijd voor deze taak." });
  }
}

/** Fired-reminder keys, stored as key -> the timestamp they fired at. */
function loadFiredMap(): Map<string, number> {
  try {
    const raw = localStorage.getItem(FIRED_STORAGE_KEY);
    if (!raw) return new Map();
    return new Map(Object.entries(JSON.parse(raw) as Record<string, number>));
  } catch {
    return new Map();
  }
}

function persistFiredMap(map: Map<string, number>): void {
  localStorage.setItem(FIRED_STORAGE_KEY, JSON.stringify(Object.fromEntries(map)));
}

/** Drops entries older than a day in place — bounds the map's growth over a long-running tab. */
function pruneFiredMap(map: Map<string, number>, now: number): void {
  for (const [key, firedAt] of map) {
    if (now - firedAt > PRUNE_AFTER_MS) map.delete(key);
  }
}

/**
 * Polls every 30s for tasks whose wekker should fire now and dispatches either
 * a browser Notification (when permission is granted) or a Sonner toast fallback.
 *
 * Architecture note: the "which tasks are due" logic lives in getDueReminders
 * (selectors.ts) — pure, no DOM. This hook only owns the dispatch + dedup.
 * A future push-notification phase replaces just the dispatch with a Supabase
 * edge function + web-push; the selector stays unchanged.
 *
 * Fired keys are re-read from localStorage (not kept only in a ref) on every
 * poll, and pruned to the last day — this both bounds memory over a long-lived
 * tab and stops two open tabs from double-firing the same reminder, since they
 * share the same underlying storage.
 */
export function useTaskReminders(): void {
  const tasks = useCuraStore((s) => s.tasks);
  const completions = useCuraStore((s) => s.completions);

  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      const fired = loadFiredMap();
      pruneFiredMap(fired, now);
      const latestByTask = buildLatestCompletionMap(completions);
      let changed = false;
      for (const reminder of getDueReminders(tasks, latestByTask, now)) {
        if (fired.has(reminder.firedForKey)) continue;
        fired.set(reminder.firedForKey, now);
        changed = true;
        dispatchReminder(reminder.title);
      }
      if (changed) persistFiredMap(fired);
    }, POLL_MS);
    return () => clearInterval(id);
  }, [tasks, completions]);
}

// ─── Notification preference — shared between the hook and ProfielSheet ──────

type PermissionState = NotificationPermission | "unsupported";

function getPermission(): PermissionState {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}

/**
 * Reads and controls the user's notification preference.
 *
 * - `enabled`: true when browser permission is granted AND the user hasn't
 *   locally opted out (via the ProfielSheet toggle).
 * - `toggle()`: requests permission if "default", opts out/in if "granted",
 *   shows a calm explanation if "denied" or "unsupported".
 * - When a wekker is saved in AddTaskSheet/EditTaskSheet, call
 *   `requestPermission()` directly (not toggle) to trigger the prompt lazily
 *   at the moment of action, not on app load.
 */
export function useNotificationPreference() {
  const [permission, setPermission] = useState<PermissionState>(getPermission);
  const [localEnabled, setLocalEnabled] = useState(
    () => localStorage.getItem(NOTIF_PREF_KEY) !== "disabled",
  );

  const enabled = permission === "granted" && localEnabled;

  async function toggle() {
    if (permission === "unsupported") {
      toast("Meldingen worden niet ondersteund in deze browser.");
      return;
    }
    if (permission === "denied") {
      toast("Meldingen zijn geblokkeerd.", {
        description: "Schakel ze in via de browserinstellingen om wekkers te ontvangen.",
      });
      return;
    }
    if (permission === "default") {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === "granted") {
        localStorage.removeItem(NOTIF_PREF_KEY);
        setLocalEnabled(true);
        toast("Meldingen aan");
      } else {
        toast("Meldingen worden geblokkeerd door je browser.");
      }
      return;
    }
    // permission === "granted" — toggle the local preference
    if (localEnabled) {
      localStorage.setItem(NOTIF_PREF_KEY, "disabled");
      setLocalEnabled(false);
      toast("Meldingen uit");
    } else {
      localStorage.removeItem(NOTIF_PREF_KEY);
      setLocalEnabled(true);
      toast("Meldingen aan");
    }
  }

  return { enabled, permission, toggle };
}

/** Request notification permission lazily (called when a wekker is saved). */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof Notification === "undefined") return "default";
  if (Notification.permission !== "default") return Notification.permission;
  return Notification.requestPermission();
}
