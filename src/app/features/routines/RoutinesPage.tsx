import { motion } from "motion/react";
import { Plus } from "lucide-react";
import { useCuraStore } from "../../../stores/useCuraStore";
import { useRoutineViews } from "../../../stores/useViews";
import { stagger, fadeUp } from "../../lib/motion";
import { Leeg, PageHeader, PillButton } from "../../components/shared";
import { RoutineKaart } from "../../components/RoutineKaart";
import { useSheets } from "../../sheetContext";

export function RoutinesPage() {
  const { openNewRoutine, openEditRoutine } = useSheets();
  const toggleTask = useCuraStore((s) => s.toggleTask);
  const routines = useRoutineViews();

  return (
    <div className="px-5 pt-14 pb-8">
      <PageHeader
        title="Routines"
        subtitle="Terugkerende structuur."
        action={
          <PillButton onClick={openNewRoutine} ariaLabel="Nieuwe routine aanmaken" icon={<Plus size={14} strokeWidth={2.5} aria-hidden="true" />}>
            Nieuw
          </PillButton>
        }
      />
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
