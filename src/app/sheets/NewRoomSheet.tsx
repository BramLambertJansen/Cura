import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useCuraStore } from "../../stores/useCuraStore";
import { ICONS, ICON_BY_KEY, SAGE } from "../lib/constants";
import { Sheet, SheetHeader, Kop, VeldInput, DubbelKnop } from "../components/shared";

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
            className="flex items-center gap-3.5 rounded-2xl px-4 py-3.5 mb-6"
            style={{ background: `${selectedIcon!.color}14`, border: `1.5px solid ${selectedIcon!.color}30` }}>
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${selectedIcon!.color}22`, color: selectedIcon!.color }}>
              {selectedIcon!.icon}
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">{name || selectedIcon!.defaultName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{selectedIcon!.label}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Kop>Kies een icoon</Kop>
      <div className="grid grid-cols-4 gap-2 mb-6">
        {ICONS.map((ic) => (
          <motion.button key={ic.key} whileTap={{ scale: 0.9 }} onClick={() => setIconKey(ic.key)}
            aria-pressed={iconKey === ic.key}
            initial={{ backgroundColor: "var(--input-background)", borderColor: "var(--border-input)", scale: 1 }}
            animate={{
              backgroundColor: iconKey === ic.key ? ic.color + "22" : "var(--input-background)",
              borderColor: iconKey === ic.key ? ic.color + "70" : "var(--border-input)",
              scale: iconKey === ic.key ? 1.04 : 1,
            }}
            transition={{ duration: 0.14 }}
            style={{ boxShadow: "var(--shadow-input)" }}
            className="flex flex-col items-center gap-1.5 py-3 rounded-2xl border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--primary)_50%,transparent)]">
            <div style={{ color: iconKey === ic.key ? ic.color : "var(--muted-foreground)" }} aria-hidden="true">{ic.icon}</div>
            <span className="text-[9px] font-medium text-muted-foreground text-center leading-tight">{ic.label}</span>
          </motion.button>
        ))}
      </div>

      <Kop>Naam</Kop>
      <VeldInput value={name} onChange={setName} placeholder="Naam van de kamer" />

      <Kop><span className="normal-case">Voorkeur eigenaar <span style={{ fontStyle: "normal", opacity: 0.7 }}>(optioneel)</span></span></Kop>
      <div className="flex flex-wrap gap-2 mt-3">
        {members.map((m) => (
          <motion.button key={m.id} whileTap={{ scale: 0.93 }} onClick={() => setOwnerId(ownerId === m.id ? null : m.id)}
            aria-pressed={ownerId === m.id}
            animate={{
              backgroundColor: ownerId === m.id ? SAGE : "var(--input-background)",
              color: ownerId === m.id ? "#ffffff" : "var(--muted-foreground)",
              boxShadow: ownerId === m.id ? "none" : "var(--shadow-input)",
            }}
            transition={{ duration: 0.14 }}
            className="px-4 py-2 rounded-full text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--primary)_50%,transparent)]">{m.displayName}</motion.button>
        ))}
      </div>

      <div className="mt-7">
        <DubbelKnop onCancel={onClose} onConfirm={save} label="Toevoegen" disabled={!iconKey || !name.trim()} />
      </div>
    </Sheet>
  );
}
