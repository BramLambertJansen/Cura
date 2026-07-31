import { useRef, type ReactNode } from "react";
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
  // Only the mode the sheet *opened* on may autofocus its field. Once the user
  // has flipped the toggle, a mode switch must leave focus (and the on-screen
  // keyboard) alone — the sheet is already open, so a field grabbing focus
  // mid-flow reads as the form jumping at you. Tracked with refs, not state,
  // because it has to be known during the render that mounts the new body.
  const openedOn = useRef(mode);
  const switched = useRef(false);
  if (mode !== openedOn.current) {
    switched.current = true;
    openedOn.current = mode;
  }

  return (
    <motion.div key={mode} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.16 }}>
      {mode === "taak"
        ? <AddTaskSheetBody roomId={roomId} onClose={onClose} headerExtra={headerExtra} />
        : <BoodschapToevoegSheetBody onClose={onClose} headerExtra={headerExtra} autoFocusTitle={!switched.current} />}
    </motion.div>
  );
}
