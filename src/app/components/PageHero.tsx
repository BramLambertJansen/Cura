import { useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { ArrowLeft } from "lucide-react";

/** The round back button shared by both PageHero variants — floats over the
 * art in "banner", sits in normal flow above the title in "compact". */
function HeroBackButton({ onBack, label }: { onBack: () => void; label: string }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.9 }}
      onClick={onBack}
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-card shadow-sm focus-ring flex-shrink-0">
      <ArrowLeft size={16} className="text-foreground" aria-hidden="true" />
    </motion.button>
  );
}

/**
 * Shared illustrated page header, in two variants:
 *
 * - `"compact"` (default) — title/subtitle sit left, a small illustration sits
 *   right in its own rounded tile. Used by every overview except Vandaag.
 *   Each `headers/*.webp` was painted panoramic (1536x512) with its subject
 *   scaled against the right edge for the old full-bleed banner; that same
 *   framing means `object-position: right center` crops straight to the
 *   subject here too, so no new art was needed for the smaller tile.
 * - `"banner"` — the original full-bleed treatment (art behind the text,
 *   masked into the page). Kept only for Vandaag: reusing the landing
 *   sunrise there makes opening the app and starting the day feel like one
 *   continuous moment, which a small side tile would break.
 */
export function PageHero({
  src,
  title,
  subtitle,
  eyebrow,
  onBack,
  backLabel = "Terug",
  topAction,
  position = "right center",
  variant = "compact",
}: {
  src: string;
  title: ReactNode;
  subtitle?: ReactNode;
  eyebrow?: ReactNode;
  onBack?: () => void;
  backLabel?: string;
  topAction?: ReactNode;
  position?: string;
  variant?: "compact" | "banner";
}) {
  const [failed, setFailed] = useState(false);

  if (variant === "banner") {
    return (
      <motion.header
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.38, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative w-full overflow-hidden"
        style={{
          height: "calc(var(--hero-height) + var(--safe-top))",
          marginTop: "calc(-1 * var(--safe-top))",
          marginLeft: "calc(-1 * var(--safe-left))",
          marginRight: "calc(-1 * var(--safe-right))",
        }}>
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-card-art"
          style={{
            WebkitMaskImage: "linear-gradient(to bottom, black 68%, transparent 100%)",
            maskImage: "linear-gradient(to bottom, black 68%, transparent 100%)",
          }}>
          {!failed && (
            <img
              src={src}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              style={{ objectPosition: position }}
              onError={() => setFailed(true)}
            />
          )}
        </div>

        {(onBack || topAction) && (
          <div
            className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5"
            style={{ paddingTop: "calc(var(--safe-top) + 1rem)" }}>
            {onBack ? <HeroBackButton onBack={onBack} label={backLabel} /> : <span />}
            {topAction}
          </div>
        )}

        <div className="absolute inset-x-0 bottom-7 z-10 px-5">
          <div className="max-w-[72%]">
            {eyebrow && <div className="mb-2">{eyebrow}</div>}
            <div role="heading" aria-level={1} className="font-display font-medium text-foreground" style={{ fontSize: "30px", lineHeight: 1.25 }}>{title}</div>
            {subtitle && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
      </motion.header>
    );
  }

  return (
    <motion.header
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="px-5 pb-6"
      style={{ paddingTop: "calc(var(--safe-top) + 1rem)" }}>
      {(onBack || topAction) && (
        <div className="flex items-center justify-between gap-4 mb-4">
          {onBack ? <HeroBackButton onBack={onBack} label={backLabel} /> : <span />}
          {topAction}
        </div>
      )}
      <div className="flex items-center gap-4">
        <div className="min-w-0 flex-1">
          {eyebrow && <div className="mb-1.5">{eyebrow}</div>}
          <div role="heading" aria-level={1} className="font-display font-medium text-foreground text-[1.75rem] leading-tight">{title}</div>
          {subtitle && <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-[1.75rem] bg-card-art">
          {!failed && (
            <img
              src={src}
              alt=""
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
              style={{ objectPosition: position }}
              onError={() => setFailed(true)}
            />
          )}
        </div>
      </div>
    </motion.header>
  );
}
