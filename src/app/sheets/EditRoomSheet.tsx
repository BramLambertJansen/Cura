import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Trash2 } from "lucide-react";
import { useCuraStore } from "../../stores/useCuraStore";
import { ICONS, ICON_BY_KEY, SAGE } from "../lib/constants";
import { Sheet, SheetHeader, Kop, VeldInput, DubbelKnop } from "../components/shared";

export function EditRoomSheet({ roomId, onClose }: { roomId: string; onClose: () => void }) {
  const room = useCuraStore((s) => s.rooms.find((r) => r.id === roomId));
  const members = useCuraStore((s) => s.members);
  const updateRoom = useCuraStore((s) => s.updateRoom);
  const deleteRoom = useCuraStore((s) => s.deleteRoom);

  const [iconKey, setIconKey] = useState(room?.iconKey ?? "sparkles");
  const [name, setName] = useState(room?.name ?? "");
  const [ownerId, setOwnerId] = useState<string | null>(room?.ownerId ?? null);
  const [confirm, setConfirm] = useState(false);

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

      <Kop>Icoon</Kop>
      <div className="grid grid-cols-4 gap-2 mb-6">
        {ICONS.map((opt) => (
          <motion.button key={opt.key} whileTap={{ scale: 0.9 }} onClick={() => setIconKey(opt.key)}
            animate={{
              backgroundColor: iconKey === opt.key ? opt.color + "22" : "var(--secondary)",
              borderColor: iconKey === opt.key ? opt.color + "70" : "rgba(0,0,0,0)",
              scale: iconKey === opt.key ? 1.04 : 1,
            }}
            transition={{ duration: 0.14 }}
            className="flex flex-col items-center gap-1.5 py-3 rounded-2xl border-2">
            <div style={{ color: iconKey === opt.key ? opt.color : "var(--muted-foreground)" }}>{opt.icon}</div>
            <span className="text-[9px] font-medium text-muted-foreground text-center leading-tight">{opt.label}</span>
          </motion.button>
        ))}
      </div>

      <Kop>Naam</Kop>
      <div className="mb-4">
        <VeldInput value={name} onChange={setName} placeholder="Naam van de kamer" />
      </div>

      <Kop><span className="normal-case">Voorkeur eigenaar <span style={{ fontStyle: "normal", opacity: 0.7 }}>(optioneel)</span></span></Kop>
      <div className="flex flex-wrap gap-2 mt-3 mb-6">
        {members.map((m) => (
          <motion.button key={m.id} whileTap={{ scale: 0.93 }} onClick={() => setOwnerId(ownerId === m.id ? null : m.id)}
            animate={{
              backgroundColor: ownerId === m.id ? SAGE : "var(--secondary)",
              color: ownerId === m.id ? "#ffffff" : "var(--muted-foreground)",
            }}
            transition={{ duration: 0.14 }}
            className="px-4 py-2 rounded-full text-sm font-medium">{m.displayName}</motion.button>
        ))}
      </div>

      <div className="mt-6 mb-4">
        <DubbelKnop onCancel={onClose} onConfirm={save} label="Opslaan" disabled={!name.trim()} />
      </div>
      <AnimatePresence>
        {!confirm
          ? <motion.button key="del" whileTap={{ scale: 0.96 }} onClick={() => setConfirm(true)} className="w-full py-3 rounded-2xl text-sm font-medium flex items-center justify-center gap-2" style={{ color: "var(--destructive)" }}><Trash2 size={14} /> Kamer verwijderen</motion.button>
          : <motion.div key="conf" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
              <motion.button whileTap={{ scale: 0.96 }} onClick={() => setConfirm(false)} className="flex-1 py-3 rounded-2xl border border-border text-foreground text-sm font-medium">Toch niet</motion.button>
              <motion.button whileTap={{ scale: 0.96 }} onClick={remove} className="flex-1 py-3 rounded-2xl text-white text-sm font-semibold" style={{ background: "var(--destructive)" }}>Ja, verwijder</motion.button>
            </motion.div>
        }
      </AnimatePresence>
    </Sheet>
  );
}
