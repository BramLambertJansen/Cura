import { memo } from "react";
import { motion } from "motion/react";
import { Check, ChevronRight } from "lucide-react";
import type { RoomView } from "../../data/types";
import { SHADOW, roomIcon } from "../lib/constants";
import { RoomBanner } from "./RoomThumb";
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
      whileTap={{ scale: 0.985 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      aria-label={openCount > 0 ? `${room.name}, ${openCount} ${openCount === 1 ? "taak" : "taken"} open` : `${room.name}, alles gedaan`}
      className={`w-full text-left rounded-3xl overflow-hidden relative focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color-mix(in_srgb,var(--primary)_50%,transparent)] ${CARD_CHROME}`}
      style={{ boxShadow: SHADOW }}>

      <RoomBanner ic={ic} color={c} className="h-28" />

      {/* Open-count sits on the art as a calm, glanceable pill — a soft check when nothing's open, never a scoreboard. */}
      <div className="absolute top-3 right-3">
        {openCount > 0 ? (
          <div className="flex items-baseline gap-1 rounded-full bg-card/90 backdrop-blur-sm pl-2.5 pr-3 py-1 shadow-sm">
            <span className="text-sm font-bold tabular-nums leading-none" style={{ color: c }}>{openCount}</span>
            <span className="text-[10px] font-medium text-muted-foreground leading-none">{openCount === 1 ? "taak" : "taken"}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 rounded-full bg-card/90 backdrop-blur-sm px-2.5 py-1 shadow-sm">
            <Check size={11} strokeWidth={2.5} style={{ color: c, opacity: 0.7 }} aria-hidden="true" />
            <span className="text-[10px] font-medium text-muted-foreground leading-none">klaar</span>
          </div>
        )}
      </div>

      <div className="px-4 pt-2 pb-3.5 flex items-end justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground leading-snug"
            style={{ fontFamily: "Lora,Georgia,serif", fontSize: "1rem" }}>{room.name}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug truncate"
            style={{ fontStyle: "italic" }}>{room.hint}</p>
          {room.owner && (
            <p className="text-[10px] mt-1 leading-none" style={{ color: c, opacity: 0.75 }}>
              Meestal {room.owner}
            </p>
          )}
        </div>
        <ChevronRight size={16} className="text-muted-foreground/40 mb-0.5 flex-shrink-0" aria-hidden="true" />
      </div>
    </motion.button>
  );
});
