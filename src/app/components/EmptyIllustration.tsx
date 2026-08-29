import { useState } from "react";

/**
 * Calm transparent watercolor illustration for gentle empty states — never
 * an alarming "niets hier" (CLAUDE.md §2). Defaults to sprout-in-clouds art
 * (`public/states/empty-cloud-watercolor.webp`); pass `src` for a scene-specific one.
 * Renders nothing if the file is missing,
 * so callers keep their text-only empty state.
 */
export function EmptyIllustration({
  src = "/states/empty-cloud-watercolor.webp", className = "",
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
    />
  );
}
