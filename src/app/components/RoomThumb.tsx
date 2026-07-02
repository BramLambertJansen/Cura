import { useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Pencil } from "lucide-react";
import type { IconOption } from "../lib/constants";

/**
 * Full-bleed watercolor header for the room-detail screen. The square room art
 * (cream sky close to --background) is shown `object-cover` in a wide, tall
 * strip so the subject fills the banner; the strip bleeds past the shell's
 * safe-area padding — up behind the status bar and out to both edges — and a
 * bottom linear mask melts it into the painted app background, so it reads as
 * one continuous header rather than a pasted-on card. Owns the floating
 * back/edit controls so they sit over the art. When the room has no image (or
 * it fails to load) it degrades to a plain padded control bar (CLAUDE.md §3),
 * and the detail screen keeps its icon+name row below.
 */
export function RoomHero({
  ic, onBack, onEdit, editLabel,
}: {
  ic: IconOption;
  onBack: () => void;
  onEdit: () => void;
  editLabel: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(ic.image) && !failed;

  const controls = (over: boolean) => (
    <div className={`flex items-center justify-between px-5 ${over ? "absolute inset-x-0 top-0" : "pt-4"}`}
      style={over ? { paddingTop: "calc(var(--safe-top) + 1rem)" } : undefined}>
      <motion.button whileTap={{ scale: 0.9 }} onClick={onBack}
        aria-label="Terug naar kamers"
        className="w-9 h-9 rounded-full flex items-center justify-center bg-card shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--primary)_50%,transparent)]">
        <ArrowLeft size={16} className="text-foreground" aria-hidden="true" />
      </motion.button>
      <motion.button whileTap={{ scale: 0.9 }} onClick={onEdit}
        aria-label={editLabel}
        className="w-9 h-9 rounded-full flex items-center justify-center bg-card shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--primary)_50%,transparent)]">
        <Pencil size={14} className="text-foreground" aria-hidden="true" />
      </motion.button>
    </div>
  );

  if (!showImage) return controls(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="relative w-full overflow-hidden"
      // Pull up behind the shell's safe-top padding and out to both edges so the
      // art reaches the physical top/side edges instead of the content inset.
      style={{
        height: "calc(14.5rem + var(--safe-top))",
        marginTop: "calc(-1 * var(--safe-top))",
        marginLeft: "calc(-1 * var(--safe-left))",
        marginRight: "calc(-1 * var(--safe-right))",
      }}
    >
      {/* Masked image layer: the bottom fade lives in this layer's (unscaled)
          coords so it always resolves to full transparent at the bottom edge,
          independent of the image zoom — and the controls stay unmasked. */}
      <div
        className="absolute inset-0"
        style={{
          WebkitMaskImage: "linear-gradient(to bottom, black 60%, transparent 100%)",
          maskImage: "linear-gradient(to bottom, black 60%, transparent 100%)",
        }}
      >
        <img
          src={ic.image}
          alt=""
          aria-hidden="true"
          loading="lazy"
          onError={() => setFailed(true)}
          // scale-[1.28] zooms past the art's cream side-margins so the painted
          // subject fills the full width and touches both edges (same crop trick
          // as RoomThumb); overflow-hidden on the parent clips the overscan.
          className="absolute inset-0 w-full h-full object-cover scale-[1.28]"
          style={{ objectPosition: "center 42%" }}
        />
      </div>
      {controls(true)}
    </motion.div>
  );
}

/**
 * The square room avatar used on room cards, the room-detail header and the
 * artwork picker. Renders the watercolor illustration (`ic.image`) when it
 * exists and loads; otherwise — or when the file is still missing — falls back
 * to the tinted gradient tile with the line icon, so partial art degrades
 * gracefully (CLAUDE.md §3, "degrade gracefully with partial data"). Pass
 * `large` on bigger tiles (the picker) so the fallback uses the 40px `iconLg`
 * instead of the 18px avatar icon.
 */
export function RoomThumb({
  ic, color, className = "", rounded = "rounded-2xl", large = false,
}: {
  ic: IconOption;
  color: string;
  /** Tailwind sizing utilities for the square, e.g. "w-14 h-14". */
  className?: string;
  rounded?: string;
  /** Use the larger line icon in the fallback — for picker-sized tiles. */
  large?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(ic.image) && !failed;

  return (
    <div className={`${className} ${rounded} flex items-center justify-center flex-shrink-0 relative overflow-hidden`}
      style={showImage ? undefined : { background: `linear-gradient(145deg,color-mix(in srgb, ${color} 10%, transparent),color-mix(in srgb, ${color} 18%, transparent))` }}>
      {showImage ? (
        <img
          src={ic.image}
          alt=""
          aria-hidden="true"
          loading="lazy"
          onError={() => setFailed(true)}
          // Slight zoom crops the art's cream margins away so the subject fills the small tile.
          className="absolute inset-0 w-full h-full object-cover scale-[1.18]"
        />
      ) : (
        <>
          <div className={`absolute inset-0 ${rounded}`}
            style={{ background: `radial-gradient(circle at 35% 30%,color-mix(in srgb, ${color} 19%, transparent) 0%,transparent 68%)` }} />
          <div className="relative" style={{ color, transform: large ? "scale(1)" : "scale(1.1)" }} aria-hidden="true">{large ? ic.iconLg : ic.icon}</div>
        </>
      )}
    </div>
  );
}

/**
 * Wide watercolor banner for the top of a room card. The square room art is
 * shown `object-cover` in a short, full-width strip so the painted vignette
 * fills it, and a bottom linear mask melts the strip into the card body below
 * (same "melt into the background" language as RoomHero) — so the card reads as
 * one warm object, not a photo pasted above text. When the room has no art (or
 * it fails to load) it degrades to a calm tinted wash with the large line icon,
 * so every card keeps the same banner shape whether or not artwork exists.
 */
export function RoomBanner({
  ic, color, className = "h-28",
}: {
  ic: IconOption;
  color: string;
  /** Tailwind height utility for the strip, e.g. "h-28". */
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(ic.image) && !failed;
  const fade = "linear-gradient(to bottom, black 60%, transparent 100%)";

  if (showImage) {
    return (
      <div className={`relative w-full ${className} overflow-hidden`}>
        <div className="absolute inset-0" style={{ WebkitMaskImage: fade, maskImage: fade }}>
          <img
            src={ic.image}
            alt=""
            aria-hidden="true"
            loading="lazy"
            onError={() => setFailed(true)}
            // A light zoom trims the art's cream side-margins; object-position keeps
            // the painted subject (counter, sofa, bed…) centred in the short strip.
            className="absolute inset-0 w-full h-full object-cover scale-[1.06]"
            style={{ objectPosition: "center 50%" }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full ${className} overflow-hidden`} style={{ WebkitMaskImage: fade, maskImage: fade }} aria-hidden="true">
      <div className="absolute inset-0" style={{ background: `linear-gradient(150deg, color-mix(in srgb, ${color} 15%, var(--card)) 0%, color-mix(in srgb, ${color} 5%, var(--card)) 100%)` }} />
      <div className="absolute inset-0" style={{ background: `radial-gradient(120% 90% at 28% 22%, color-mix(in srgb, ${color} 22%, transparent) 0%, transparent 62%)` }} />
      <div className="absolute inset-0 flex items-center justify-center" style={{ color, opacity: 0.5 }}>{ic.iconLg}</div>
    </div>
  );
}
