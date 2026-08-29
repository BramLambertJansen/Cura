import { motion } from "motion/react";
import { Plus } from "lucide-react";
import { useCuraStore } from "../../../stores/useCuraStore";
import { useRoutineViews } from "../../../stores/useViews";
import { stagger, fadeUp } from "../../lib/motion";
import { Leeg, PillButton } from "../../components/shared";
import { PageHero } from "../../components/PageHero";
import { RoutineKaart } from "../../components/RoutineKaart";
import { useSheets } from "../../sheetContext";

export function RoutinesPage() {
  const { openNewRoutine, openEditRoutine } = useSheets();
  const toggleTask = useCuraStore((s) => s.toggleTask);
  const routines = useRoutineViews();

  return (
    <div className="pb-8">
      <PageHero
        src="/headers/routines-watercolor.webp"
        title="Routines"
        topAction={
          <PillButton onClick={openNewRoutine} ariaLabel="Nieuwe routine aanmaken" icon={<Plus size={14} strokeWidth={2.5} aria-hidden="true" />}>
            Nieuw
          </PillButton>
        }
      />
      <div className="px-5">
      {routines.length === 0
        ? <Leeg image="/states/empty-routines-watercolor.webp" text="Nog geen routines. Bundel taken die je vaak samen doet, zoals opruimen voor het slapen." />
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
    </div>
  );
}
