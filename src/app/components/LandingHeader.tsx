import { useState } from "react";
import { Logo } from "./Logo";

/**
 * Full-bleed header illustration for the landing / auth screen. The watercolor
 * sunrise (public/landing-header.webp) sits at the top edge and fades out at its
 * bottom into the app background via a mask gradient — no hard background
 * knockout needed, since the illustration's cream sky already matches
 * --background (CLAUDE.md §7: derive from tokens, don't hardcode). The title
 * sits over the art with a soft scrim behind it to hold WCAG AA contrast (§6).
 */
export function LandingHeader({ subtitle }: { subtitle: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <header className="relative z-10 w-full h-[38vh] min-h-[13rem] max-h-72 overflow-hidden">
      {!failed && (
        <img
          src="/landing-header.webp"
          alt=""
          aria-hidden="true"
          onError={() => setFailed(true)}
          className="absolute inset-0 w-full h-full object-cover object-top"
          style={{
            WebkitMaskImage: "linear-gradient(to bottom, black 55%, transparent 100%)",
            maskImage: "linear-gradient(to bottom, black 55%, transparent 100%)",
          }}
        />
      )}
      {/* Soft bottom-up scrim so the title stays legible over the brighter parts of the art. */}
      <div
        className="absolute inset-x-0 bottom-0 h-2/3 pointer-events-none"
        style={{
          background:
            "linear-gradient(to top, color-mix(in srgb, var(--background) 88%, transparent) 0%, transparent 100%)",
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 flex flex-col items-center text-center px-6 pb-6"
        style={{ paddingTop: "var(--safe-top)" }}
      >
        <Logo size={48} className="mb-3 rounded-xl shadow-sm" />
        <h1 className="text-[2rem] font-medium text-foreground leading-none font-display">
          Cura
        </h1>
        <p className="text-sm text-muted-foreground mt-2">{subtitle}</p>
      </div>
    </header>
  );
}
