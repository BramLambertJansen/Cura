import type { ReactNode } from "react";
import { motion } from "motion/react";
import { AddTaskSheetBody } from "./AddTaskSheet";
import { BoodschapToevoegSheetBody } from "./BoodschapToevoegSheet";

/**
 * Body of the FAB's universal add-flow: whichever of the two add-forms the
 * Taak/Boodschap toggle currently points at, rendered *inside* the one `Sheet`
 * shell App.tsx keeps mounted for both.
 *
 * Deliberately one module holding both bodies rather than two lazy imports:
 * with a separate chunk per mode, the first toggle press suspends, the shared
 * shell collapses to its drag handle for a few frames and drops to the bottom
 * of the screen — the same flicker the shared shell exists to avoid. One chunk
 * means a mode switch is a plain re-render.
 */
export function AddFlowBody({
  mode, roomId, onClose, headerExtra,
}: {
  mode: "taak" | "boodschap";
  roomId?: string | null;
  onClose: () => void;
  headerExtra?: ReactNode;
}) {
  return (
    <motion.div key={mode} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.16 }}>
      {mode === "taak"
        ? <AddTaskSheetBody roomId={roomId} onClose={onClose} headerExtra={headerExtra} />
        : <BoodschapToevoegSheetBody onClose={onClose} headerExtra={headerExtra} />}
    </motion.div>
  );
}
