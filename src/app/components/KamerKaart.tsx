import { memo } from "react";
import { motion } from "motion/react";
import { Check, ChevronRight } from "lucide-react";
import type { RoomView } from "../../data/types";
import { SHADOW, roomIcon } from "../lib/constants";
import { RoomThumb } from "./RoomThumb";
import { CARD_CHROME } from "./shared";

export const KamerKaart = memo(function KamerKaart({
  room, onClick,
}: { room: RoomView; onClick: () => void }) {
  const ic = roomIcon(room.iconKey);
  const c = room.color || ic.color;
  const openCount = room.openCount;

  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.983 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      aria-label={openCount > 0 ? `${room.name}, ${openCount} ${openCount === 1 ? "taak" : "taken"} open` : `${room.name}, alles gedaan`}
      className={`w-full flex items-center gap-4 text-left rounded-2xl px-4 py-3.5 overflow-hidden relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--primary)_50%,transparent)] ${CARD_CHROME}`}
      style={{ boxShadow: SHADOW }}>

      <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full"
        style={{ background: `linear-gradient(to bottom,${c},color-mix(in srgb, ${c} 33%, transparent))` }} />

      <RoomThumb ic={ic} color={c} className="w-14 h-14" />

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground leading-snug"
          style={{ fontFamily: "Lora,Georgia,serif", fontSize: "0.9375rem" }}>{room.name}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug truncate"
          style={{ fontStyle: "italic" }}>{room.hint}</p>
        {room.owner && (
          <p className="text-[10px] mt-1 leading-none" style={{ color: c, opacity: 0.7 }}>
            Meestal {room.owner}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2.5 flex-shrink-0">
        {openCount > 0 ? (
          <div className="flex flex-col items-center min-w-[1.75rem]">
            <span className="text-xl font-bold leading-none tabular-nums" style={{ color: c }}>{openCount}</span>
            <span className="text-[9px] text-muted-foreground leading-none mt-0.5 font-medium">
              {openCount === 1 ? "taak" : "taken"}
            </span>
          </div>
        ) : (
          <div className="w-6 h-6 rounded-full flex items-center justify-center" aria-hidden="true"
            style={{ background: `color-mix(in srgb, ${c} 8%, transparent)` }}>
            <Check size={11} strokeWidth={2.5} style={{ color: c, opacity: 0.65 }} />
          </div>
        )}
        <ChevronRight size={15} className="text-muted-foreground/40" aria-hidden="true" />
      </div>
    </motion.button>
  );
});
