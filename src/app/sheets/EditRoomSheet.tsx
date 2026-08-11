import { useState } from "react";
import { AnimatePresence } from "motion/react";
import { useCuraStore } from "../../stores/useCuraStore";
import { useRoomView } from "../../stores/useViews";
import { ICONS, ICON_BY_KEY } from "../lib/constants";
import { ROOM_TEMPLATES, categoryForIconKey } from "../lib/templates";
import { Sheet, SheetHeader, Kop, VeldInput, DubbelKnop, VerwijderKnop, TaakToevoegRij } from "../components/shared";
import { KamerKunstKiezer } from "../components/KamerKunstKiezer";
import { TaakDraftRij, type TaakDraftItem } from "./TaakDraftRij";

// TaakDraftRij (built for routine-task drafts, which have no recurrence)
// doesn't expose intervalDays — extend its item shape locally so a
// category-default template's recurrence rides along untouched through this
// sheet instead of silently getting dropped on save.
type QuickAddDraft = TaakDraftItem & { intervalDays?: number };

export function EditRoomSheet({ roomId, onClose }: { roomId: string; onClose: () => void }) {
  const room = useRoomView(roomId);
  const updateRoom = useCuraStore((s) => s.updateRoom);
  const deleteRoom = useCuraStore((s) => s.deleteRoom);

  const [iconKey, setIconKey] = useState(room?.iconKey ?? "sparkles");
  const [name, setName] = useState(room?.name ?? "");
  // Seeded from the room's own list if it has one, else a preview of the
  // static per-category defaults (templates.ts). `templatesDirty` stays false until
  // the user actually adds/edits/removes a row, so opening this sheet and
  // saving WITHOUT touching this section never pins a snapshot over a room
  // that's still meant to follow the live category defaults.
  const [templates, setTemplates] = useState<QuickAddDraft[]>(() =>
    (room?.quickAddTemplates.length ? room.quickAddTemplates : ROOM_TEMPLATES[categoryForIconKey(room?.iconKey ?? "sparkles")])
      .map((t): QuickAddDraft => ({ key: crypto.randomUUID(), ...t })),
  );
  const [templatesDirty, setTemplatesDirty] = useState(false);
  const [templateInput, setTemplateInput] = useState("");

  if (!room) return null;
  const ic = ICON_BY_KEY[iconKey] ?? ICONS[ICONS.length - 1];

  function addTemplate() {
    if (!templateInput.trim()) return;
    setTemplates((p) => [...p, { key: crypto.randomUUID(), title: templateInput.trim() }]);
    setTemplateInput("");
    setTemplatesDirty(true);
  }

  function save() {
    if (!name.trim()) return;
    updateRoom(roomId, {
      iconKey, color: ic.color, name: name.trim(),
      ...(templatesDirty ? { quickAddTemplates: templates.map(({ key, ...t }) => t) } : {}),
    });
    onClose();
  }

  function remove() {
    deleteRoom(roomId);
    onClose();
  }

  return (
    <Sheet onClose={onClose} tall>
      <SheetHeader title={`${room.name} bewerken`} onClose={onClose} />

      <Kop>Kies een kamer</Kop>
      <div className="mb-6">
        <KamerKunstKiezer value={iconKey} onChange={setIconKey} />
      </div>

      <Kop>Naam</Kop>
      <div className="mb-4">
        <VeldInput value={name} onChange={setName} placeholder="Naam van de kamer" />
      </div>

      <Kop>Snel toevoegen</Kop>
      <p className="text-sm text-muted-foreground -mt-2 mb-4 leading-relaxed">
        Deze taken kun je in {room.name} met één tik toevoegen.
      </p>
      <div className="space-y-2 mb-4 max-h-64 overflow-y-auto scrollbar-hide">
        <AnimatePresence>
          {templates.map((t, i) => (
            <TaakDraftRij
              key={t.key}
              draft={t}
              onChange={(patch) => {
                setTemplates((p) => p.map((d, j) => (j === i ? { ...d, ...patch } : d)));
                setTemplatesDirty(true);
              }}
              onRemove={() => {
                setTemplates((p) => p.filter((_, j) => j !== i));
                setTemplatesDirty(true);
              }}
            />
          ))}
        </AnimatePresence>
      </div>
      <TaakToevoegRij
        value={templateInput}
        onChange={setTemplateInput}
        onAdd={addTemplate}
        placeholder="Sneltoevoegen-taak…"
        addLabel="Sneltoevoegen-taak toevoegen"
      />

      <div className="mt-6 mb-4">
        <DubbelKnop onCancel={onClose} onConfirm={save} label="Opslaan" disabled={!name.trim()} />
      </div>
      <VerwijderKnop label="Kamer verwijderen" ariaLabel={`${room.name} verwijderen`} onConfirm={remove} />
    </Sheet>
  );
}
