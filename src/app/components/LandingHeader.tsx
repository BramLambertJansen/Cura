import { useState } from "react";

/**
 * Decorative full-bleed watercolor sunrise for the landing / auth screen. The
 * art (public/landing-header.webp) sits at the top edge and fades out at its
 * bottom into the app background via a mask gradient — the illustration's cream
 * sky already matches --background (CLAUDE.md §7: derive from tokens, don't
 * hardcode), so no hard background knockout is needed.
 *
 * Purely decorative: the brand mark + wordmark + subtitle now live in the auth
 * card that rises over this art, so the header renders nothing when the image
 * is missing — the branding in the card is the graceful fallback.
 */
export function LandingHeader({ className }: { className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <div aria-hidden="true" className={`relative w-full overflow-hidden ${className ?? ""}`}>
      <img
        src="/landing-header.webp"
        alt=""
        onError={() => setFailed(true)}
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          // The sun + hills sit on the right of the wide source art; bias the
          // cover-crop there so the sunrise is what shows behind the auth card,
          // not the empty middle sky.
          objectPosition: "72% 42%",
          WebkitMaskImage: "linear-gradient(to bottom, black 58%, transparent 100%)",
          maskImage: "linear-gradient(to bottom, black 58%, transparent 100%)",
        }}
      />
    </div>
  );
}
