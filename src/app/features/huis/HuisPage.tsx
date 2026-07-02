import { useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Pencil, Plus, Sparkles } from "lucide-react";
import { useCuraStore } from "../../../stores/useCuraStore";
import { useRoomViews, useTaskViews } from "../../../stores/useViews";
import { roomIcon } from "../../lib/constants";
import { spring, stagger, fadeUp } from "../../lib/motion";
import { PageHeader, HintBanner, Card, IconBadge } from "../../components/shared";
import { TaakRij } from "../../components/TaakRij";
import { KamerKaart } from "../../components/KamerKaart";
import { RoomHero } from "../../components/RoomThumb";
import { EmptyIllustration } from "../../components/EmptyIllustration";
import { useSheets } from "../../sheetContext";

export function HuisPage() {
  const { openNewRoom, openEditRoom, openEditTask, openTemplates } = useSheets();
  const toggleTask = useCuraStore((s) => s.toggleTask);
  const claimTask = useCuraStore((s) => s.claimTask);
  const rooms = useRoomViews();
  const tasks = useTaskViews();
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  const room = rooms.find((r) => r.id === selectedRoomId);

  if (room) {
    const ic = roomIcon(room.iconKey);
    const c = room.color || ic.color;
    const roomTasks = tasks.filter((t) => t.roomId === room.id);
    const open = roomTasks.filter((t) => !t.done);
    const done = roomTasks.filter((t) => t.done);
    return (
      <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={spring}>
        <div className="px-5 pt-14">
          <div className="flex items-center justify-between">
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setSelectedRoomId(null)}
              aria-label="Terug naar kamers"
              className="w-9 h-9 rounded-full flex items-center justify-center bg-card shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--primary)_50%,transparent)]">
              <ArrowLeft size={16} className="text-foreground" aria-hidden="true" />
            </motion.button>
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => openEditRoom(room.id)}
              aria-label={`${room.name} bewerken`}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-card shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--primary)_50%,transparent)]">
              <Pencil size={14} className="text-foreground" aria-hidden="true" />
            </motion.button>
          </div>
          <RoomHero ic={ic} />
          <div className="flex items-center gap-2.5 mt-5">
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `color-mix(in srgb, ${c} 16%, transparent)`, color: c }}>{ic.icon}</div>
            <div>
              <h2 className="text-[1.65rem] font-medium text-foreground leading-tight" style={{ fontFamily: "Lora,Georgia,serif" }}>{room.name}</h2>
              {room.owner && <p className="text-muted-foreground text-xs mt-0.5">Meestal {room.owner}</p>}
            </div>
          </div>
        </div>

        <div className="mx-5 mt-5">
          <HintBanner>{room.hint}</HintBanner>
        </div>

        <div className="px-5 pt-4 pb-8 space-y-2.5">
          {roomTasks.length === 0
            ? (
              <Card onClick={() => openTemplates(room.id, room.iconKey)} className="flex flex-col items-center gap-3 py-10 px-6 text-center" ariaLabel="Snelle taken toevoegen aan deze kamer">
                <IconBadge icon={<Sparkles size={20} />} size={44} />
                <div>
                  <p className="text-sm font-semibold text-foreground">Voeg snelle taken toe</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed max-w-[220px]">Kies uit een paar veelvoorkomende taken voor deze ruimte.</p>
                </div>
              </Card>
            )
            : <>
                <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-2.5">
                  {open.map((t) => (
                    <motion.div key={t.id} variants={fadeUp}>
                      <TaakRij task={t} onToggle={() => toggleTask(t.id, !t.done)} showClaim onClaim={() => claimTask(t.id, true)} onUnclaim={() => claimTask(t.id, false)} onEdit={() => openEditTask(t.id)} />
                    </motion.div>
                  ))}
                </motion.div>
                {done.map((t) => (
                  <TaakRij key={t.id} task={t} onToggle={() => toggleTask(t.id, !t.done)} onEdit={() => openEditTask(t.id)} />
                ))}
              </>
          }
        </div>
      </motion.div>
    );
  }

  return (
    <div className="px-5 pt-14 pb-8">
      <PageHeader title="Huis" subtitle="Wat staat er te doen?" />
      {rooms.length === 0 && (
        <div className="text-center pt-4 pb-6">
          <EmptyIllustration />
          <p className="text-sm text-muted-foreground mt-1">Nog geen kamers. Voeg er hieronder een toe.</p>
        </div>
      )}
      <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-2.5">
        {rooms.map((r) => (
          <motion.div key={r.id} variants={fadeUp}>
            <KamerKaart room={r} onClick={() => setSelectedRoomId(r.id)} />
          </motion.div>
        ))}
        <motion.div variants={fadeUp}>
          <motion.button onClick={openNewRoom} whileTap={{ scale: 0.985 }}
            className="w-full flex items-center gap-4 bg-card rounded-2xl px-4 py-3.5 border-2 border-dashed"
            style={{ borderColor: "color-mix(in srgb, var(--border-color) 16%, transparent)", color: "var(--muted-foreground)" }}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 bg-secondary">
              <Plus size={20} strokeWidth={1.75} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-muted-foreground">Kamer toevoegen</p>
              <p className="text-[11px] text-muted-foreground/60 mt-0.5" style={{ fontStyle: "italic" }}>Geef elke ruimte een plek</p>
            </div>
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  );
}
