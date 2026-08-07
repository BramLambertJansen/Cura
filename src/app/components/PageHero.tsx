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
  eyebrow,
  onBack,
  backLabel = "Terug",
  topAction,
  position = "right center",
}: {
  src: string;
  title: ReactNode;
  eyebrow?: ReactNode;
  onBack?: () => void;
  backLabel?: string;
  topAction?: ReactNode;
  position?: string;
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
      </div>
    </motion.header>
  );
}
