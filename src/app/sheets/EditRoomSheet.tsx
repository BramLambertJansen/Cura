import { useState } from "react";
import { useCuraStore } from "../../stores/useCuraStore";
import { useRoomView } from "../../stores/useViews";
import { ICONS, ICON_BY_KEY } from "../lib/constants";
import { Sheet, SheetHeader, Kop, VeldInput, DubbelKnop, KeuzeChip, VerwijderKnop } from "../components/shared";
import { KamerKunstKiezer } from "../components/KamerKunstKiezer";

export function EditRoomSheet({ roomId, onClose }: { roomId: string; onClose: () => void }) {
  const room = useRoomView(roomId);
  const members = useCuraStore((s) => s.members);
  const updateRoom = useCuraStore((s) => s.updateRoom);
  const deleteRoom = useCuraStore((s) => s.deleteRoom);

  const [iconKey, setIconKey] = useState(room?.iconKey ?? "sparkles");
  const [name, setName] = useState(room?.name ?? "");
  const [ownerId, setOwnerId] = useState<string | null>(room?.ownerId ?? null);

  if (!room) return null;
  const ic = ICON_BY_KEY[iconKey] ?? ICONS[ICONS.length - 1];

  function save() {
    if (!name.trim()) return;
    updateRoom(roomId, { iconKey, color: ic.color, name: name.trim(), ownerId: ownerId ?? undefined });
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

      <Kop><span className="normal-case">Voorkeur eigenaar <span style={{ fontStyle: "normal", opacity: 0.7 }}>(optioneel)</span></span></Kop>
      <div className="flex flex-wrap gap-2 mt-3 mb-6">
        {members.map((m) => (
          <KeuzeChip key={m.id} selected={ownerId === m.id} onClick={() => setOwnerId(ownerId === m.id ? null : m.id)}>
            {m.displayName}
          </KeuzeChip>
        ))}
      </div>

      <div className="mt-6 mb-4">
        <DubbelKnop onCancel={onClose} onConfirm={save} label="Opslaan" disabled={!name.trim()} />
      </div>
      <VerwijderKnop label="Kamer verwijderen" ariaLabel={`${room.name} verwijderen`} onConfirm={remove} />
    </Sheet>
  );
}
