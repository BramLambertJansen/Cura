import { useEffect } from "react";
import { useSearchParams } from "react-router";

/**
 * Deep-link a wekker to its task. Two entry points, both landing on `openTask`
 * (= openEditTask, which renders EditTaskSheet):
 *
 *  - Cold start / new window: the push notification carried
 *    `/vandaag?taak=<id>` (see send-reminders + sw.ts), so we read the param
 *    once on mount, open the sheet, and strip `taak` from the URL so a later
 *    refresh doesn't reopen it.
 *  - App already open: the service worker's notificationclick handler focuses
 *    the existing tab and posts `{ type: "cura-open-task", taskId }` — routing
 *    in-SPA instead of a hard reload. We open the same sheet on that message.
 *
 * EditTaskSheet renders null for an unknown/gone task, so a stale link (deleted
 * or not-yet-synced task) is a no-op rather than a crash.
 */
export function useTaskDeepLink(openTask: (taskId: string) => void): void {
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const taak = searchParams.get("taak");
    if (!taak) return;
    openTask(taak);
    const next = new URLSearchParams(searchParams);
    next.delete("taak");
    // replace: don't leave a history entry whose back-nav re-triggers the link.
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, openTask]);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      const data = e.data as { type?: string; taskId?: string } | null;
      if (data?.type === "cura-open-task" && typeof data.taskId === "string" && data.taskId) {
        openTask(data.taskId);
      }
    }
    navigator.serviceWorker?.addEventListener("message", onMessage);
    return () => navigator.serviceWorker?.removeEventListener("message", onMessage);
  }, [openTask]);
}
