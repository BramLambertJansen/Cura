import { useState } from "react";

/**
 * Calm watercolor illustration for gentle empty states — never an alarming
 * "niets hier" (CLAUDE.md §2). Defaults to the sprout-in-clouds art
 * (public/empty-cloud.webp); pass `src` for a scene-specific one (e.g.
 * /empty-plants.webp on Vandaag). Renders nothing if the file is missing,
 * so callers keep their text-only empty state.
 */
export function EmptyIllustration({
  src = "/empty-cloud.webp", className = "",
}: { src?: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      loading="lazy"
      onError={() => setFailed(true)}
      className={`w-40 h-40 object-contain mx-auto ${className}`}
      style={{
        // Melt the art's baked-in cream margins into the page background, so it never reads as a pasted-on square.
        WebkitMaskImage: "radial-gradient(ellipse 72% 72% at 50% 50%, black 55%, transparent 100%)",
        maskImage: "radial-gradient(ellipse 72% 72% at 50% 50%, black 55%, transparent 100%)",
      }}
    />
  );
}
