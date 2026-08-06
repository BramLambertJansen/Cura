import { useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { ArrowLeft } from "lucide-react";

/**
 * Shared illustrated page header. Artwork stays decorative and dissolves into
 * the page; navigation lives at the top while the page identity is anchored
 * at the bottom, so every overview and room detail starts in the same rhythm.
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
  subtitleMaxWidth = "56%",
}: {
  src: string;
  title: ReactNode;
  subtitle?: ReactNode;
  eyebrow?: ReactNode;
  onBack?: () => void;
  backLabel?: string;
  topAction?: ReactNode;
  position?: string;
  /** Overrides the subtitle's default 56% cap — see the comment at its use below. */
  subtitleMaxWidth?: string;
}) {
  const [failed, setFailed] = useState(false);

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
          {onBack ? (
            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={onBack}
              aria-label={backLabel}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-card shadow-sm focus-ring">
              <ArrowLeft size={16} className="text-foreground" aria-hidden="true" />
            </motion.button>
          ) : <span />}
          {topAction}
        </div>
      )}

      <div className="absolute inset-x-0 bottom-7 z-10 px-5">
        <div className="max-w-[72%]">
          {eyebrow && <div className="mb-2">{eyebrow}</div>}
          <div role="heading" aria-level={1} className="font-display font-medium text-foreground" style={{ fontSize: "30px", lineHeight: 1.25 }}>{title}</div>
        </div>
        {/* A narrower cap than the title's own 72%, measured against the same
            full-width containing block (not nested inside the title's div,
            which would compound the two percentages) — a wrapped subtitle's
            second/third line is what actually reaches into the art's subject
            on longer copy (Routines' gift box, Focustimer's idle screen),
            where the title's own shorter single line never did. 56% clears
            every header's art at every viewport width tried (375–430px).
            Focustimer overrides this wider (see its own call site) — its
            subtitle is long enough that 56% would wrap it to a 4th line,
            and that extra line's height pushes the eyebrow+title above it
            up into the fixed-position back button (measured overlap goes
            from ~18px, already there today at any width ≥65%, to ~40px+
            once a 4th line lands) — a worse regression than the graze
            against the art's low-contrast paper/pencil prop that 65% still
            leaves, so this is the one call site that keeps a wider cap on
            purpose rather than a hack to shrink later. */}
        {subtitle && (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground" style={{ maxWidth: subtitleMaxWidth }}>
            {subtitle}
          </p>
        )}
      </div>
    </motion.header>
  );
}
