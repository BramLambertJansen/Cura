import { memo } from "react";
import { motion } from "motion/react";
import { Check, X } from "lucide-react";
import type { TaskSuggestionView } from "../../data/types";
import { IconButton } from "./shared";

/**
 * A single pending AI-voorstel — accepteren or afwijzen, both a single tap.
 * Deliberately NOT a variant of SuggestieRij: different source data
 * (TaskSuggestionView, not TaskView), different actions (accepteren/afwijzen
 * vs plannen/niet-vandaag), and a required `sourceNote` + attribution line
 * SuggestieRij has no concept of (CLAUDE.md §5 → AI-voorstellen). Shares the
 * same visual language — title + reden-regel + two round IconButtons.
 */
export const AiVoorstelRij = memo(function AiVoorstelRij({
  suggestion, onAccept, onDismiss,
}: {
  suggestion: TaskSuggestionView;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22 }}
      className="bg-card rounded-[0.875rem] px-3.5 py-3 flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-[0.9375rem] font-medium text-foreground leading-snug">{suggestion.title}</p>
        {/* The honest "why" first, then room/duration/wanneer — same order as
            SuggestieRij's reden-regel, only what actually exists. */}
        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
          {suggestion.sourceNote}
          {suggestion.room && ` · ${suggestion.room}`}
          {suggestion.duration && ` · ${suggestion.duration}`}
        </p>
        <p className="text-[0.6875rem] text-muted-foreground/75 mt-1 leading-snug">
          Voorgesteld door {suggestion.createdBy}
        </p>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <IconButton
          tone="primary"
          size={9}
          onClick={onAccept}
          label={`${suggestion.title} overnemen`}
          icon={<Check size={17} aria-hidden="true" />}
        />
        <IconButton
          tone="secondary"
          size={8}
          onClick={onDismiss}
          label={`${suggestion.title} afwijzen`}
          icon={<X size={16} className="text-muted-foreground" aria-hidden="true" />}
        />
      </div>
    </motion.div>
  );
});
