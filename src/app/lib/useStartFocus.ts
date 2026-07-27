import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router";
import type { TaskView } from "../../data/types";
import { usePomodoroStore } from "../../stores/usePomodoroStore";

/** Standaardduur voor een focussessie vanaf een taak zonder eigen duur. */
const DEFAULT_FOCUS_MIN = 25;

/**
 * Start een focussessie vanaf een taak en spring naar het focus-scherm. De timer
 * neemt de duur van de taak over (of 25 min bij ontbreken) en onthoudt titel +
 * id, zodat het scherm laat zien waar je aan werkt en na afronden "afvinken" kan
 * aanbieden. Gedeeld door elke taakrij-call-site (Vandaag, Taken, Huis).
 */
export function useStartFocus(): (task: TaskView) => void {
  const navigate = useNavigate();
  const location = useLocation();
  const start = usePomodoroStore((s) => s.start);

  return useCallback(
    (task: TaskView) => {
      const min = task.durationMin && task.durationMin > 0 ? task.durationMin : DEFAULT_FOCUS_MIN;
      start({ totalSec: min * 60, phase: "focus", taskId: task.id, taskTitle: task.title });
      // Remember where this was started from so FocusPage's back button can
      // return there — unless we're already on /focus itself (its own
      // "Volgende op je dag" idle-state card), in which case carry the
      // existing origin forward instead of pointing back at /focus.
      const from = location.pathname === "/focus"
        ? (location.state as { from?: string } | null)?.from
        : location.pathname;
      navigate("/focus", { state: { from } });
    },
    [navigate, start, location],
  );
}
