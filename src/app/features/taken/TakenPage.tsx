import { motion } from "motion/react";
import { useCuraStore } from "../../../stores/useCuraStore";
import { useTaskViews } from "../../../stores/useViews";
import { toTaskOverview } from "../../../data/selectors";
import type { TaskView } from "../../../data/types";
import { stagger, fadeUp } from "../../lib/motion";
import { Kop, Leeg, PageHeader } from "../../components/shared";
import { TaakRij } from "../../components/TaakRij";
import { useSheets } from "../../sheetContext";

/**
 * Takenoverzicht — every open task on one page, grouped by date status. The
 * split is derived (see `toTaskOverview`); this screen just renders the calm
 * buckets. Empty groups are skipped so it never shows four empty cards.
 */
export function TakenPage() {
  const { openEditTask } = useSheets();
  const toggleTask = useCuraStore((s) => s.toggleTask);
  const tasks = useTaskViews();
  const { overdue, upcoming, recurring, undated } = toTaskOverview(tasks);

  const groups: { label: string; tasks: TaskView[] }[] = [
    { label: "Al even blijven liggen", tasks: overdue },
    { label: "In de toekomst", tasks: upcoming },
    { label: "Terugkerende wekkers", tasks: recurring },
    { label: "Geen datum", tasks: undated },
  ];
  const nonEmpty = groups.filter((g) => g.tasks.length > 0);

  return (
    <div className="px-5 pt-14 pb-8">
      <PageHeader title="Takenoverzicht" subtitle="Alles op een rij, geordend op datum." />
      {nonEmpty.length === 0
        ? <Leeg icon="🗂️" text="Nog geen taken om te tonen." />
        : <div className="space-y-8">
            {nonEmpty.map((group) => (
              <section key={group.label}>
                <Kop>{group.label}</Kop>
                <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-2.5">
                  {group.tasks.map((task) => (
                    <motion.div key={task.id} variants={fadeUp}>
                      <TaakRij
                        task={task}
                        onToggle={() => toggleTask(task.id, !task.done)}
                        onEdit={() => openEditTask(task.id)}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              </section>
            ))}
          </div>
      }
    </div>
  );
}
