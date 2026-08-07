import { memo } from "react";
import { motion } from "motion/react";
import { Check } from "lucide-react";
import type { RoomView } from "../../data/types";
import { SAGE, SHADOW, SHADOW_LG, roomIcon } from "../lib/constants";
import { RoomThumb } from "./RoomThumb";

/**
 * Compact image-tile room card for the Huis grid — art on top, name below on
 * the tile's own opaque surface (so `featured`'s border/shadow accent stays
 * legible regardless of which watercolor sits behind it — the WCAG AA concern
 * that first ruled out a full-bleed photo-grid treatment here). The open
 * count/done state is a small corner badge on the art instead — safe there
 * because the badge brings its own solid fill, so its own text/icon contrast
 * never depends on the artwork underneath, unlike bare text over a photo
 * would. `featured`'s "verdient aandacht" semantics live only in the button's
 * aria-label, same as before.
 */
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
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      aria-label={
        featured
          ? `${room.name}, verdient aandacht, ${openCount} ${openCount === 1 ? "taak" : "taken"} open`
          : openCount > 0 ? `${room.name}, ${openCount} ${openCount === 1 ? "taak" : "taken"} open`
          : showDoneBadge ? `${room.name}, alles gedaan`
          : room.name
      }
      className={`h-full w-full flex flex-col rounded-2xl overflow-hidden bg-card-art focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color-mix(in_srgb,var(--primary)_50%,transparent)] ${featured ? "border-2" : "border border-border/60"}`}
      style={{ boxShadow: featured ? SHADOW_LG : SHADOW, borderColor: featured ? `color-mix(in srgb, ${c} 45%, transparent)` : undefined }}>
      {/* The padding lives on this outer, non-aspect wrapper — not on the square
          itself — so the inner square's `w-full` resolves against an already-
          narrowed content box and shrinks proportionally (real margin on all
          sides), instead of just squeezing the image into a distorted crop
          inside an unchanged-size square. bg-card-art matches RoomThumb's own
          fill, so the margin reads as the same surface, not a second box. */}
      <div className="w-full px-2.5 pt-2.5">
        <div className="relative w-full aspect-square">
          <RoomThumb ic={ic} color={c} className="w-full h-full" rounded="rounded-xl" large />
          {openCount > 0 ? (
            <span
              aria-hidden="true"
              className="absolute top-1.5 right-1.5 min-w-[1.25rem] h-5 px-1 rounded-full flex items-center justify-center text-[0.65rem] font-bold text-white leading-none tabular-nums"
              style={{ background: SAGE, boxShadow: "0 1px 4px color-mix(in srgb, var(--shadow-color) 35%, transparent)" }}>
              {openCount}
            </span>
          ) : showDoneBadge ? (
            <span
              aria-hidden="true"
              className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center bg-card"
              style={{ boxShadow: "0 1px 4px color-mix(in srgb, var(--shadow-color) 35%, transparent)" }}>
              <Check size={11} strokeWidth={2.5} style={{ color: c, opacity: 0.7 }} />
            </span>
          ) : null}
        </div>
      </div>
      <div className="px-2.5 pb-3.5 pt-2 text-center min-w-0">
        <p className="text-sm font-semibold text-foreground leading-snug font-display truncate">{room.name}</p>
      </div>
    </motion.button>
  );
});
