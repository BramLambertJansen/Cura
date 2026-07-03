import { motion } from "motion/react";
import { Check } from "lucide-react";
import { ICONS } from "../lib/constants";
import { RoomThumb } from "./RoomThumb";

/**
 * Artwork picker for room create/edit — a grid of selectable room tiles that
 * shows the watercolor illustration where it exists and the tinted line-icon
 * fallback otherwise (via RoomThumb, so both stay one source of truth). Picking
 * a tile sets the room's `iconKey`; the image + color are derived from it, so
 * there's no separate persisted "image" field. Shared by NewRoomSheet and
 * EditRoomSheet instead of the old duplicated line-icon grids.
 */
export function KamerKunstKiezer({
  value, onChange,
}: { value: string; onChange: (key: string) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2.5" role="radiogroup" aria-label="Kies een kamer">
      {ICONS.map((ic) => {
        const selected = value === ic.key;
        return (
          <motion.button
            key={ic.key}
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={() => onChange(ic.key)}
            role="radio"
            aria-checked={selected}
            aria-label={ic.label}
            className="flex flex-col items-center gap-1.5 rounded-2xl focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
            <div className="relative w-full aspect-square rounded-2xl overflow-hidden" style={{ boxShadow: "var(--shadow-input)" }}>
              <RoomThumb ic={ic} color={ic.color} className="w-full h-full" rounded="rounded-2xl" large scaleImage={false} />
              <motion.div
                className="absolute inset-0 rounded-2xl pointer-events-none"
                initial={false}
                animate={{ boxShadow: selected ? `inset 0 0 0 2.5px ${ic.color}` : `inset 0 0 0 0px ${ic.color}00` }}
                transition={{ duration: 0.14 }}
              />
              {selected && (
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 24 }}
                  className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center shadow-sm"
                  style={{ background: ic.color }}>
                  <Check size={12} strokeWidth={3} className="text-white" aria-hidden="true" />
                </motion.div>
              )}
            </div>
            <span className="text-[10px] font-medium text-center leading-tight" style={{ color: selected ? ic.color : "var(--muted-foreground)" }}>{ic.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
