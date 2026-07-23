import { memo } from "react";
import { motion } from "motion/react";
import { Check, ChevronRight } from "lucide-react";
import type { RoomView } from "../../data/types";
import { SHADOW, SHADOW_LG, roomIcon } from "../lib/constants";
import { RoomArt } from "./RoomThumb";
import { StatusBadge } from "./shared";

export const KamerKaart = memo(function KamerKaart({
  room, onClick, featured = false,
}: { room: RoomView; onClick: () => void; featured?: boolean }) {
  const ic = roomIcon(room.iconKey);
  const c = room.color || ic.color;
  const openCount = room.openCount;
  // A room with zero defined tasks has never had anything to finish — showing
  // the same "alles gedaan" checkmark as a room that's truly cleared out would
  // misrepresent a just-created, empty room as caught up.
  const showDoneBadge = openCount === 0 && room.tasks.length > 0;

  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.985 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      aria-label={
        featured
          ? `${room.name}, verdient aandacht, ${openCount} ${openCount === 1 ? "taak" : "taken"} open`
          : openCount > 0 ? `${room.name}, ${openCount} ${openCount === 1 ? "taak" : "taken"} open`
          : showDoneBadge ? `${room.name}, alles gedaan`
          : room.name
      }
      // bg-card-room = a hair of the illustrations' cream mixed into --card (token in theme.css).
      className={`w-full flex items-center text-left gap-4 pl-3 pr-5 py-3 rounded-3xl overflow-hidden relative bg-card-room focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color-mix(in_srgb,var(--primary)_50%,transparent)] ${featured ? "border-2" : "border border-border/60"}`}
      style={{ boxShadow: featured ? SHADOW_LG : SHADOW, borderColor: featured ? `color-mix(in srgb, ${c} 45%, transparent)` : undefined }}>

      {/* The art is a transparent PNG, so it floats on the warm card colour;
          its faint warm feather is invisible against it. */}
      <RoomArt ic={ic} color={c} className={`${featured ? "w-24 h-24" : "w-20 h-20"} rounded-2xl flex-shrink-0`} objectPosition="center 48%" />

      <div className="flex-1 min-w-0">
        {featured && (
          <div className="mb-1">
            <StatusBadge enter="slide">Verdient aandacht</StatusBadge>
          </div>
        )}
        <p className="font-semibold text-foreground leading-snug font-display"
          style={{ fontSize: "0.9375rem" }}>{room.name}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug truncate"
          style={{ fontStyle: "italic" }}>{room.hint}</p>
        {room.owner && (
          <p className="text-[10px] mt-1 leading-none" style={{ color: c, opacity: 0.75 }}>
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
        ) : showDoneBadge ? (
          <div className="w-6 h-6 rounded-full flex items-center justify-center" aria-hidden="true"
            style={{ background: `color-mix(in srgb, ${c} 8%, transparent)` }}>
            <Check size={11} strokeWidth={2.5} style={{ color: c, opacity: 0.65 }} />
          </div>
        ) : null}
        <ChevronRight size={15} className="text-muted-foreground/40" aria-hidden="true" />
      </div>
    </motion.button>
  );
});
