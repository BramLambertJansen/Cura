import { memo } from "react";
import { motion } from "motion/react";
import { Heart, Sparkles, ArrowRight, Check } from "lucide-react";
import { SAGE } from "../lib/constants";
import type { ReactieKind } from "../lib/useReacties";

const OPTIONS: { kind: ReactieKind; label: string; icon: typeof Heart }[] = [
  { kind: "bedankt", label: "Bedank", icon: Heart },
  { kind: "mooi_gedaan", label: "Mooi gedaan", icon: Sparkles },
  { kind: "volgende", label: "Ik pak de volgende", icon: ArrowRight },
];

/** Three subtle, one-tap reactions on a Samen activity row — no scores, no ranking, just warmth. */
export const ActiviteitReacties = memo(function ActiviteitReacties({
  reacted, onReact,
}: { reacted?: ReactieKind; onReact: (kind: ReactieKind) => void }) {
  if (reacted) {
    const chosen = OPTIONS.find((o) => o.kind === reacted)!;
    return (
      <div className="flex items-center gap-1.5 mt-2 text-xs font-medium" style={{ color: SAGE }} aria-live="polite">
        <Check size={12} aria-hidden="true" />
        <span>{chosen.label === "Ik pak de volgende" ? "Genoteerd — fijn!" : `${chosen.label} · verstuurd`}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
      {OPTIONS.map(({ kind, label, icon: Icon }) => (
        <motion.button
          key={kind}
          whileTap={{ scale: 0.94 }}
          onClick={() => onReact(kind)}
          aria-label={label}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium text-muted-foreground"
          style={{ background: "color-mix(in srgb, var(--accent) 20%, transparent)" }}
        >
          <Icon size={11} aria-hidden="true" />
          {label}
        </motion.button>
      ))}
    </div>
  );
});
