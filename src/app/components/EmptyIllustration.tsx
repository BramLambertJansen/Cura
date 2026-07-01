import { useState } from "react";

/**
 * Calm watercolor sprout-in-clouds illustration (public/empty-cloud.png) for
 * gentle empty states — never an alarming "niets hier" (CLAUDE.md §2). Renders
 * nothing if the file is missing, so callers keep their text-only empty state.
 */
export function EmptyIllustration({ className = "" }: { className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <img
      src="/empty-cloud.png"
      alt=""
      aria-hidden="true"
      loading="lazy"
      onError={() => setFailed(true)}
      className={`w-40 h-40 object-contain mx-auto ${className}`}
    />
  );
}
