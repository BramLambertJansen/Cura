import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useCuraStore } from "../../stores/useCuraStore";
import { ICON_BY_KEY, SAGE } from "../lib/constants";
import { Sheet, SheetHeader, Kop, VeldInput, DubbelKnop, KeuzeChip } from "../components/shared";
import { RoomThumb } from "../components/RoomThumb";
import { KamerKunstKiezer } from "../components/KamerKunstKiezer";

export function NewRoomSheet({ onClose }: { onClose: () => void }) {
  const createRoom = useCuraStore((s) => s.createRoom);
  const members = useCuraStore((s) => s.members);
  const [iconKey, setIconKey] = useState("");
  const [name, setName] = useState("");
  const [ownerId, setOwnerId] = useState<string | null>(null);

  const selectedIcon = ICON_BY_KEY[iconKey];

  useEffect(() => {
    if (iconKey && !name) setName(selectedIcon?.defaultName ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iconKey]);

  function save() {
    if (!iconKey || !name.trim()) return;
    createRoom({ name: name.trim(), iconKey, color: selectedIcon?.color ?? SAGE, ownerId: ownerId ?? undefined });
    onClose();
  }

  return (
    <Sheet onClose={onClose} tall>
      <SheetHeader title="Kamer toevoegen" onClose={onClose} />

      <AnimatePresence>
        {iconKey && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: -6 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92 }}
            className="flex items-center gap-3.5 rounded-2xl px-4 py-3 mb-6"
            style={{ background: `color-mix(in srgb, ${selectedIcon!.color} 8%, transparent)`, border: `1.5px solid color-mix(in srgb, ${selectedIcon!.color} 19%, transparent)` }}>
            <RoomThumb ic={selectedIcon!} color={selectedIcon!.color} className="w-12 h-12" rounded="rounded-xl" />
            <div>
              <p className="font-semibold text-foreground text-sm">{name || selectedIcon!.defaultName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{selectedIcon!.label}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Kop>Kies een kamer</Kop>
      <div className="mb-6">
        <KamerKunstKiezer value={iconKey} onChange={setIconKey} />
      </div>

      <Kop>Naam</Kop>
      <VeldInput value={name} onChange={setName} placeholder="Naam van de kamer" />

      <Kop><span className="normal-case">Voorkeur eigenaar <span style={{ fontStyle: "normal", opacity: 0.7 }}>(optioneel)</span></span></Kop>
      <div className="flex flex-wrap gap-2 mt-3">
        {members.map((m) => (
          <KeuzeChip key={m.id} selected={ownerId === m.id} onClick={() => setOwnerId(ownerId === m.id ? null : m.id)}>
            {m.displayName}
          </KeuzeChip>
        ))}
      </div>

      <div className="mt-7">
        <DubbelKnop onCancel={onClose} onConfirm={save} label="Toevoegen" disabled={!iconKey || !name.trim()} />
      </div>
    </Sheet>
  );
}
