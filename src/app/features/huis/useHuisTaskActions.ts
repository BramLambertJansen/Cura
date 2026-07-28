import { useCallback, useRef } from "react";
import { toast } from "sonner";
import { useCuraStore } from "../../../stores/useCuraStore";
import { useTaskDismissals } from "../../lib/useTaskDismissals";
import type { TaskView } from "../../../data/types";

/**
 * Task actions shared by Huis's list view (HuisPage) and its room-detail view
 * (RoomDetailPage) — both wire the same "op mijn dag zetten" swipe/claim and
 * "niet vandaag" dismiss-with-undo onto their TaakRij rows. Owns the single
 * useTaskDismissals() instance for whichever page uses it, so dismissWithUndo
 * and the page's own isTaskDismissed filter never read from two independent
 * (and therefore possibly out-of-sync) hook instances.
 *
 * Every dispatcher here is id-based and stable (never recreated with a new
 * identity across renders) — TaakRij's memo() only skips re-rendering a row
 * whose task didn't change if ALL of its callback props are stable (#173);
 * a fresh closure per render on even one of them defeats it for every row.
 * `planTask`/`dismissWithUndo` look the current task up via a ref instead of
 * closing over `tasks` directly, since that view-model array's identity
 * churns every minute (the tick-driven done-flip recompute) and would
 * otherwise make these callbacks just as unstable as the closures they replace.
 */
export function useHuisTaskActions(tasks: TaskView[]) {
  const claimTask = useCuraStore((s) => s.claimTask);
  const updateTask = useCuraStore((s) => s.updateTask);
  const { isDismissed: isTaskDismissed, dismiss: dismissTask, restore: restoreTask } = useTaskDismissals();

  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;

  const handleUnclaim = useCallback((taskId: string) => { void claimTask(taskId, false); }, [claimTask]);

  // Swipe-right on a pool row both plans and claims the task. Planning an
  // unplanned task auto-claims it (useCuraStore.updateTask); a task that's
  // already planned but unclaimed (e.g. someone let go of it via "Laat los")
  // needs the direct claim instead, since re-setting `planned: true` on an
  // already-planned task is a no-op transition and wouldn't claim it.
  const planTask = useCallback(
    (taskId: string) => {
      const t = tasksRef.current.find((x) => x.id === taskId);
      if (!t) return;
      if (t.planned) claimTask(taskId, true);
      else updateTask(taskId, { planned: true });
      toast("Op je dag gezet", { description: `${t.title} staat klaar wanneer jij wilt.` });
    },
    [claimTask, updateTask],
  );

  const dismissWithUndo = useCallback(
    (taskId: string, waar: string) => {
      const t = tasksRef.current.find((x) => x.id === taskId);
      if (!t) return;
      dismissTask(taskId);
      toast("Even niet vandaag", {
        description: `${t.title} staat even uit ${waar}.`,
        action: { label: "Ongedaan maken", onClick: () => restoreTask(taskId) },
      });
    },
    [dismissTask, restoreTask],
  );

  return { claimTask, handleUnclaim, isTaskDismissed, planTask, dismissWithUndo };
}
