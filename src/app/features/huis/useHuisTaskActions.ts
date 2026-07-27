import { toast } from "sonner";
import { useCuraStore } from "../../../stores/useCuraStore";
import { useTaskDismissals } from "../../lib/useTaskDismissals";

/**
 * Task actions shared by Huis's list view (HuisPage) and its room-detail view
 * (RoomDetailPage) — both wire the same "op mijn dag zetten" swipe/claim and
 * "niet vandaag" dismiss-with-undo onto their TaakRij rows. Owns the single
 * useTaskDismissals() instance for whichever page uses it, so dismissWithUndo
 * and the page's own isTaskDismissed filter never read from two independent
 * (and therefore possibly out-of-sync) hook instances.
 */
export function useHuisTaskActions() {
  const claimTask = useCuraStore((s) => s.claimTask);
  const updateTask = useCuraStore((s) => s.updateTask);
  const { isDismissed: isTaskDismissed, dismiss: dismissTask, restore: restoreTask } = useTaskDismissals();

  // Swipe-right on a pool row both plans and claims the task. Planning an
  // unplanned task auto-claims it (useCuraStore.updateTask); a task that's
  // already planned but unclaimed (e.g. someone let go of it via "Laat los")
  // needs the direct claim instead, since re-setting `planned: true` on an
  // already-planned task is a no-op transition and wouldn't claim it.
  const planTask = (t: { id: string; title: string; planned: boolean }) => {
    if (t.planned) claimTask(t.id, true);
    else updateTask(t.id, { planned: true });
    toast("Op je dag gezet", { description: `${t.title} staat klaar wanneer jij wilt.` });
  };

  const dismissWithUndo = (t: { id: string; title: string }, waar: string) => {
    dismissTask(t.id);
    toast("Even niet vandaag", {
      description: `${t.title} staat even uit ${waar}.`,
      action: { label: "Ongedaan maken", onClick: () => restoreTask(t.id) },
    });
  };

  return { claimTask, isTaskDismissed, planTask, dismissWithUndo };
}
