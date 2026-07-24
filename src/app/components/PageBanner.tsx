import { useState } from "react";
import { useDaypart } from "../lib/useDaypart";

/**
 * Decorative watercolor backdrop behind a page header — the in-page sibling of
 * LandingHeader. Absolutely positioned against the top of the page (the caller
 * makes its root `relative`), fading into --background at the bottom so the
 * header text stays readable without a scrim: the art's cream sky already
 * matches the app background (CLAUDE.md §7, derive from tokens). Renders
 * nothing when the file is missing or fails, so layout never depends on it.
 *
 * The art sits on top of the same `--daypart-*-bg` wash MainShell already
 * tints its background with (src/app/lib/useDaypart.ts) — one shared
 * mechanism, not a second daypart implementation — and is itself multiplied
 * into that wash so the strip's warmth shifts across the day like the rest
 * of the shell instead of reading as a flat, static photo.
 */
export function PageBanner({
  src, className = "h-44", position = "50% 50%",
}: {
  src: string;
  /** Tailwind height utilities for the backdrop strip, e.g. "h-44". */
  className?: string;
  /** CSS object-position — steer the art's focal point (the sun, the mugs) on narrow viewports. */
  position?: string;
}) {
  const [failed, setFailed] = useState(false);
  const daypart = useDaypart();
  if (failed) return null;
  return (
    <div aria-hidden="true" className={`absolute inset-x-0 top-0 overflow-hidden pointer-events-none select-none ${className}`}>
      <div className="absolute inset-0" style={{ background: `var(--daypart-${daypart}-bg)` }} />
      <img
        src={src}
        alt=""
        onError={() => setFailed(true)}
        className="w-full h-full object-cover"
        style={{
          objectPosition: position,
          opacity: 0.85,
          mixBlendMode: "multiply",
          WebkitMaskImage: "linear-gradient(to bottom, black 40%, transparent 98%)",
          maskImage: "linear-gradient(to bottom, black 40%, transparent 98%)",
        }}
      />
    </div>
  );
}
