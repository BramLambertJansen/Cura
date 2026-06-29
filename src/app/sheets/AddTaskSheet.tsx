import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, RefreshCw } from "lucide-react";
import { useCuraStore } from "../../stores/useCuraStore";
import { useRoomViews } from "../../stores/useViews";
import { SAGE } from "../lib/constants";
import { intervalLabel } from "../lib/format";
import { Sheet, SheetHeader, VeldInput, DubbelKnop, Toggle } from "../components/shared";
import { IntervalKiezer } from "./IntervalKiezer";

export function AddTaskSheet({ onClose }: { onClose: () => void }) {
  const createTask = useCuraStore((s) => s.createTask);
  const rooms = useRoomViews();
  const [title, setTitle] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [herhalenAan, setHerhalenAan] = useState(false);
  const [intervalDagen, setIntervalDagen] = useState(7);

  function handleAdd() {
    if (!title.trim()) return;
    createTask({
      title: title.trim(),
      roomId: selectedRoomId ?? undefined,
      intervalDays: herhalenAan ? intervalDagen : undefined,
      planned: false,
    });
    onClose();
  }

  return (
    <Sheet onClose={onClose}>
      <SheetHeader title="Taak toevoegen" onClose={onClose} />
      <VeldInput autoFocus value={title} onChange={setTitle} onEnter={handleAdd} placeholder="Wat moet er gebeuren?" />
      <p className="text-xs text-muted-foreground mt-3 mb-4 leading-relaxed">De taak komt in de gedeelde pool. Kies optioneel een kamer.</p>

      <div className="grid grid-cols-2 gap-2 mb-6">
        {rooms.map((r) => {
          const active = selectedRoomId === r.id;
          const color = r.color;
          return (
            <motion.button
              key={r.id}
              onClick={() => setSelectedRoomId(active ? null : r.id)}
              whileTap={{ scale: 0.94 }}
              aria-pressed={active}
              aria-label={active ? `${r.name} deselecteren` : `${r.name} selecteren`}
              initial={{ backgroundColor: "var(--secondary)", borderColor: "rgba(0,0,0,0)" }}
              animate={{
                backgroundColor: active ? color + "18" : "var(--secondary)",
                borderColor: active ? color + "60" : "rgba(0,0,0,0)",
              }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-2.5 px-4 py-3.5 rounded-2xl border-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(73,110,70,0.5)]"
            >
              <motion.span
                animate={{
                  color: active ? "var(--foreground)" : "var(--muted-foreground)",
                  fontWeight: active ? 600 : 500,
                }}
                transition={{ duration: 0.15 }}
                className="text-sm"
              >
                {r.name}
              </motion.span>
              {active && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="ml-auto flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center"
                  style={{ background: color }}
                >
                  <Check size={9} strokeWidth={3} className="text-white" aria-hidden="true" />
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between py-3.5 px-4 rounded-2xl" style={{ background: "var(--secondary)" }}>
          <div className="flex items-center gap-2.5">
            <RefreshCw size={16} style={{ color: herhalenAan ? SAGE : "var(--muted-foreground)" }} aria-hidden="true" />
            <span className="text-sm font-medium text-foreground">Herhalen</span>
            {herhalenAan && (
              <motion.span initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(73,110,70,0.12)", color: SAGE }}>
                {intervalLabel(intervalDagen)}
              </motion.span>
            )}
          </div>
          <Toggle checked={herhalenAan} onChange={setHerhalenAan} label="Taak herhalen" />
        </div>

        <AnimatePresence initial={false}>
          {herhalenAan && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ type: "spring", stiffness: 360, damping: 34 }}
              className="overflow-hidden">
              <IntervalKiezer value={intervalDagen} onChange={setIntervalDagen} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <DubbelKnop onCancel={onClose} onConfirm={handleAdd} label="Toevoegen" disabled={!title.trim()} />
    </Sheet>
  );
}
