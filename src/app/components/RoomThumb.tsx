import { useState } from "react";
import { motion } from "motion/react";
import type { IconOption } from "../lib/constants";

/**
 * Wide, calm room illustration for the room-detail header. Square watercolor
 * art (with cream margins close to --background) is shown `object-contain`
 * so nothing gets cropped; a radial mask melts the art's edges into the
 * painted app background so it never reads as a pasted-on square. Renders
 * nothing when the room has no image or the file fails to load, so the
 * detail header simply keeps its icon+name row.
 */
export function RoomHero({ ic }: { ic: IconOption }) {
  const [failed, setFailed] = useState(false);
  if (!ic.image || failed) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="w-full flex justify-center overflow-hidden"
      aria-hidden="true"
    >
      <img
        src={ic.image}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
        className="h-48 w-auto object-contain"
        style={{
          WebkitMaskImage: "radial-gradient(ellipse 72% 72% at 50% 50%, black 58%, transparent 100%)",
          maskImage: "radial-gradient(ellipse 72% 72% at 50% 50%, black 58%, transparent 100%)",
        }}
      />
    </motion.div>
  );
}

/**
 * The square room avatar used on room cards and the room-detail header.
 * Renders the watercolor illustration (`ic.image`) when it exists and loads;
 * otherwise — or when the file is still missing — falls back to the tinted
 * gradient tile with the line icon, so partial art degrades gracefully
 * (CLAUDE.md §3, "degrade gracefully with partial data").
 */
export function RoomThumb({
  ic, color, className = "", rounded = "rounded-2xl",
}: {
  ic: IconOption;
  color: string;
  /** Tailwind sizing utilities for the square, e.g. "w-14 h-14". */
  className?: string;
  rounded?: string;
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
          <div className="relative" style={{ color, transform: "scale(1.1)" }}>{ic.icon}</div>
        </>
      )}
    </div>
  );
}
