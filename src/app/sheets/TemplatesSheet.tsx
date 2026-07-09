import { useState } from "react";
import { motion } from "motion/react";
import { useCuraStore } from "../../stores/useCuraStore";
import { SAGE } from "../lib/constants";
import {
  ROOM_TEMPLATES, TEMPLATE_CATEGORIES, TEMPLATE_CATEGORY_LABEL, categoryForIconKey, type TemplateCategory,
} from "../lib/templates";
import { Sheet, SheetHeader, Kop, DubbelKnop, KeuzeChip } from "../components/shared";

/** Quick-add from the static template library — for a new or empty room (CLAUDE.md §5). */
export function TemplatesSheet({
  roomId, roomIconKey, onClose,
}: { roomId: string; roomIconKey: string; onClose: () => void }) {
  const createTasksFromTemplates = useCuraStore((s) => s.createTasksFromTemplates);
  const [category, setCategory] = useState<TemplateCategory>(() => categoryForIconKey(roomIconKey));
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const templates = ROOM_TEMPLATES[category];

  function toggle(title: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  }

  function save() {
    const chosen = templates.filter((t) => selected.has(t.title));
    if (chosen.length === 0) return;
    void createTasksFromTemplates(roomId, chosen);
    onClose();
  }

  return (
    <Sheet onClose={onClose} tall>
      <SheetHeader title="Snelle taken" onClose={onClose} />
      <p className="text-sm text-muted-foreground -mt-4 mb-6">Kies wat past — je kunt later altijd meer toevoegen.</p>

      <Kop>Soort ruimte</Kop>
      <div className="flex flex-wrap gap-2 mb-6">
        {TEMPLATE_CATEGORIES.map((c) => (
          <KeuzeChip key={c} selected={category === c} onClick={() => { setCategory(c); setSelected(new Set()); }}>
            {TEMPLATE_CATEGORY_LABEL[c]}
          </KeuzeChip>
        ))}
      </div>

      <Kop>Taken</Kop>
      <div className="space-y-2 mb-7">
        {templates.map((t) => {
          const checked = selected.has(t.title);
          return (
            <motion.button
              key={t.title}
              whileTap={{ scale: 0.985 }}
              onClick={() => toggle(t.title)}
              role="checkbox"
              aria-checked={checked}
              aria-label={t.title}
              className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-left border focus-ring"
              style={{
                background: checked ? "color-mix(in srgb, var(--primary) 8%, transparent)" : "var(--input-background)",
                borderColor: checked ? "color-mix(in srgb, var(--primary) 42%, transparent)" : "var(--border-input)",
              }}
            >
              <span
                aria-hidden="true"
                className="w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center"
                style={{ borderColor: checked ? SAGE : "color-mix(in srgb, var(--outline-color) 28%, transparent)", background: checked ? SAGE : "transparent" }}
              >
                {checked && <span className="w-2 h-2 rounded-full bg-white" />}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium text-foreground">{t.title}</span>
                {(t.durationMin || t.description) && (
                  <span className="block text-xs text-muted-foreground mt-0.5">
                    {t.durationMin ? `${t.durationMin} min` : ""}
                    {t.durationMin && t.description ? " · " : ""}
                    {t.description}
                  </span>
                )}
              </span>
            </motion.button>
          );
        })}
      </div>

      <DubbelKnop
        onCancel={onClose}
        onConfirm={save}
        label={selected.size > 0 ? `Toevoegen (${selected.size})` : "Toevoegen"}
        disabled={selected.size === 0}
      />
    </Sheet>
  );
}
