import { memo } from "react";
import { motion } from "motion/react";
import { Check } from "lucide-react";
import type { RoomView } from "../../data/types";
import { SHADOW, SHADOW_LG, roomIcon } from "../lib/constants";
import { RoomThumb } from "./RoomThumb";

/**
 * Compact image-tile room card for the Huis grid — art on top, name (and a
 * quiet status line) below on the tile's own opaque surface. That surface
 * placement is what lets `featured`/openCount stay legible: text never sits
 * on top of the photo itself, only ever on the card's flat background, so
 * WCAG AA contrast doesn't depend on which watercolor happens to be behind it
 * (the concern that first ruled out a full-bleed photo-grid treatment here).
 * `featured` is a border/shadow accent only — decorative, `aria-hidden` by
 * omission — the real "verdient aandacht" semantics live in the button's own
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
      className={`h-full w-full flex flex-col rounded-2xl overflow-hidden bg-card focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color-mix(in_srgb,var(--primary)_50%,transparent)] ${featured ? "border-2" : "border border-border/60"}`}
      style={{ boxShadow: featured ? SHADOW_LG : SHADOW, borderColor: featured ? `color-mix(in srgb, ${c} 45%, transparent)` : undefined }}>
      <div className="w-full aspect-square p-1.5">
        <RoomThumb ic={ic} color={c} className="w-full h-full" rounded="rounded-xl" large />
      </div>
      <div className="px-1.5 pb-2.5 pt-0.5 text-center min-w-0">
        <p className="text-xs font-semibold text-foreground leading-snug font-display truncate">{room.name}</p>
        {openCount > 0 ? (
          <p className="text-[0.68rem] leading-snug mt-0.5 font-medium" style={{ color: c }}>
            {openCount} {openCount === 1 ? "taak" : "taken"}
          </p>
        ) : showDoneBadge ? (
          <div className="flex justify-center mt-1" aria-hidden="true">
            <Check size={11} strokeWidth={2.5} style={{ color: c, opacity: 0.65 }} />
          </div>
        ) : null}
      </div>
    </motion.button>
  );
});
