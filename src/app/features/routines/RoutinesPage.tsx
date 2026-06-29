import { motion } from "motion/react";
import { Plus } from "lucide-react";
import { useCuraStore } from "../../../stores/useCuraStore";
import { useRoutineViews } from "../../../stores/useViews";
import { SAGE } from "../../lib/constants";
import { stagger, fadeUp } from "../../lib/motion";
import { Leeg } from "../../components/shared";
import { RoutineKaart } from "../../components/RoutineKaart";
import { useSheets } from "../../sheetContext";

export function RoutinesPage() {
  const { openNewRoutine, openEditRoutine } = useSheets();
  const toggleTask = useCuraStore((s) => s.toggleTask);
  const routines = useRoutineViews();

  return (
    <div className="px-5 pt-14 pb-8">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mb-8">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-[2rem] font-medium text-foreground leading-tight" style={{ fontFamily: "Lora,Georgia,serif" }}>Routines</h1>
            <p className="text-sm text-muted-foreground mt-1.5">Terugkerende structuur.</p>
          </div>
          <motion.button onClick={openNewRoutine} whileTap={{ scale: 0.9 }}
            aria-label="Nieuwe routine aanmaken"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-semibold mb-0.5"
            style={{ background: "rgba(73,110,70,0.1)", color: SAGE }}>
            <Plus size={14} strokeWidth={2.5} aria-hidden="true" /> Nieuw
          </motion.button>
        </div>
      </motion.div>
      {routines.length === 0
        ? <Leeg icon="🔄" text="Nog geen routines. Maak je eerste aan." />
        : <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-3.5">
            {routines.map((r) => (
              <motion.div key={r.id} variants={fadeUp}>
                <RoutineKaart
                  routine={r}
                  onToggleTask={(taskId) => {
                    const t = r.tasks.find((x) => x.id === taskId);
                    toggleTask(taskId, !(t?.done ?? false));
                  }}
                  onEdit={() => openEditRoutine(r.id)}
                />
              </motion.div>
            ))}
          </motion.div>
      }
    </div>
  );
}
