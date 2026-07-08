import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useCuraStore } from "../../stores/useCuraStore";
import { buildLatestCompletionMap, getDueReminders } from "../../data/reminders";
import { showLocalNotification } from "./showNotification";

const POLL_MS = 30_000;
const NOTIF_PREF_KEY = "cura:notif-pref";

export function resolveReminderChannel(
  userDisabled: boolean,
  permission: NotificationPermission | "unsupported",
): "none" | "notification" | "toast" {
  if (userDisabled) return "none";
  return permission === "granted" ? "notification" : "toast";
}

function dispatchReminder(
  title: string,
  tag: string,
  taskId: string,
  openTask?: (taskId: string) => void,
) {
  const userDisabled = localStorage.getItem(NOTIF_PREF_KEY) === "disabled";
  const permission = typeof Notification === "undefined" ? "unsupported" : Notification.permission;
  const channel = resolveReminderChannel(userDisabled, permission);
  const canOpen = !!openTask && !!taskId;

  if (channel === "none") return;
  if (channel === "notification") {
    // tag = firedForKey: an identical wekker arriving via server push (same key,
    // thanks to the shared timezone-aware engine) coalesces into one OS
    // notification instead of buzzing twice. Routes through the service worker
    // (showLocalNotification) so the bare Notification constructor — illegal on
    // Android Chrome — can't throw into React; the SW's notificationclick handler
    // opens the task, so we only pass an onClick fallback for the no-SW path.
    showLocalNotification(`Tijd voor: ${title}`, {
      body: "Je hebt dit op de planning staan.",
      tag,
      icon: "/icons/icon-192.png",
      taskId: canOpen ? taskId : undefined,
      onClick: canOpen ? () => openTask!(taskId) : undefined,
    });
  } else {
    toast(`Wekker: ${title}`, {
      description: "Tijd voor deze taak.",
      action: canOpen ? { label: "Bekijk", onClick: () => openTask!(taskId) } : undefined,
    });
  }
}

/**
 * Polls every 30s for tasks whose wekker should fire now and dispatches either
 * a browser Notification (when permission is granted) or a Sonner toast fallback.
 *
 * Architecture note: the "which tasks are due" logic lives in getDueReminders
 * (data/reminders.ts) — pure, no DOM, and shared verbatim with the server-side
 * push scheduler (Supabase edge function + pg_cron). This hook owns the in-app
 * dispatch + dedup for when the app is open; the edge function owns delivery
 * when the app is closed. It passes the household timezone so the recurring
 * firedForKey matches the server's exactly (falls back to the runtime timezone
 * before the household has loaded).
 *
 * When the app IS visible, the service worker forwards an incoming push to this
 * hook (a `cura-reminder` message) instead of showing its own OS notification,
 * so a push and a poll-tick for the same wekker route through one dedup set.
 */
export function useTaskReminders(openTask?: (taskId: string) => void): void {
  const tasks = useCuraStore((s) => s.tasks);
  const completions = useCuraStore((s) => s.completions);
  const timeZone = useCuraStore((s) => s.households[0]?.timeZone);
  const firedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    function fire(firedForKey: string, title: string, taskId: string) {
      if (firedRef.current.has(firedForKey)) return;
      firedRef.current.add(firedForKey);
      dispatchReminder(title, firedForKey, taskId, openTask);
    }
    function check() {
      const latestByTask = buildLatestCompletionMap(completions);
      for (const reminder of getDueReminders(tasks, latestByTask, Date.now(), timeZone)) {
        fire(reminder.firedForKey, reminder.title, reminder.taskId);
      }
    }
    // Check meteen, niet pas na de eerste 30s-tik: zo gaat een wekker die al toe
    // is af zodra de app opent. En omdat dit effect opnieuw draait bij elke
    // wijziging aan tasks/completions (afvinken, pull-to-refresh, realtime-writes
    // van een huisgenoot), voorkomt de directe check dat een burst het interval
    // telkens reset vóór het ooit tikt — de firedRef-dedup houdt het bij één melding.
    check();
    const id = setInterval(check, POLL_MS);

    function onSwMessage(e: MessageEvent) {
      const data = e.data as { type?: string; title?: string; firedForKey?: string; taskId?: string } | null;
      if (data?.type === "cura-reminder" && typeof data.firedForKey === "string") {
        fire(
          data.firedForKey,
          typeof data.title === "string" ? data.title : "een taak",
          typeof data.taskId === "string" ? data.taskId : "",
        );
      }
    }
    navigator.serviceWorker?.addEventListener("message", onSwMessage);
    return () => {
      clearInterval(id);
      navigator.serviceWorker?.removeEventListener("message", onSwMessage);
    };
  }, [tasks, completions, timeZone, openTask]);
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
