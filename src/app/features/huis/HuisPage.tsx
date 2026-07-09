import { useNavigate, useParams } from "react-router";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Plus, Sparkles } from "lucide-react";
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
import { useTaskDismissals } from "../../lib/useTaskDismissals";

export function HuisPage() {
  const { openNewRoom, openEditRoom, openEditTask, openTemplates, openAddTask } = useSheets();
  const toggleTask = useCuraStore((s) => s.toggleTask);
  const claimTask = useCuraStore((s) => s.claimTask);
  const rooms = useRoomViews();
  const tasks = useTaskViews();
  const { isDismissed: isTaskDismissed, dismiss: dismissTask, restore: restoreTask } = useTaskDismissals();
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();

  const room = rooms.find((r) => r.id === roomId);
  const dismissWithUndo = (t: { id: string; title: string }, waar: string) => {
    dismissTask(t.id);
    toast("Even niet vandaag", { description: `${t.title} staat even uit ${waar}.`, action: { label: "Ongedaan maken", onClick: () => restoreTask(t.id) } });
  };

  if (room) {
    const ic = roomIcon(room.iconKey);
    const roomTasks = tasks.filter((t) => t.roomId === room.id && !isTaskDismissed(t.id));
    const open = roomTasks.filter((t) => !t.done);
    const done = roomTasks.filter((t) => t.done);

    return (
      <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={spring}>
        <RoomHero
          ic={ic}
          onBack={() => navigate("/huis")}
          onEdit={() => openEditRoom(room.id)}
          editLabel={`${room.name} bewerken`}
        />

        <div className={`px-5 pb-6 relative z-10 ${ic.image ? "-mt-10" : "pt-4"}`}>
          <h2 className="text-3xl font-medium text-foreground leading-tight font-display">{room.name}</h2>
          {room.owner && <p className="text-muted-foreground text-xs mt-1">Meestal {room.owner}</p>}
        </div>

        <div className="px-5 pb-6">
          <HintBanner>{room.hint}</HintBanner>
        </div>

        <div className="px-5 pb-28 space-y-3">
          {roomTasks.length === 0 ? (
            <Card onClick={() => openTemplates(room.id, room.iconKey)} className="flex flex-col items-center gap-3 py-10 px-6 text-center" ariaLabel="Snelle taken toevoegen aan deze kamer">
              <IconBadge icon={<Sparkles size={20} />} size={44} />
              <div>
                <p className="text-sm font-semibold text-foreground">Voeg snelle taken toe</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed max-w-[220px]">Kies uit een paar veelvoorkomende taken voor deze ruimte.</p>
              </div>
            </Card>
          ) : (
            <>
              <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-3">
                {open.map((t) => (
                  <motion.div key={t.id} variants={fadeUp}>
                    <TaakRij
                      task={t}
                      onToggle={() => toggleTask(t.id, !t.done)}
                      showClaim
                      onClaim={() => claimTask(t.id, true)}
                      onUnclaim={() => claimTask(t.id, false)}
                      onEdit={() => openEditTask(t.id)}
                      onDismiss={() => dismissWithUndo(t, "deze lijst")}
                    />
                  </motion.div>
                ))}
              </motion.div>
              {done.map((t) => (
                <TaakRij key={t.id} task={t} onToggle={() => toggleTask(t.id, !t.done)} onEdit={() => openEditTask(t.id)} onDismiss={() => dismissWithUndo(t, "deze lijst")} />
              ))}
            </>
          )}

          <button
            onClick={() => openAddTask(room.id)}
            className="w-full flex items-center gap-3 bg-card rounded-2xl px-4 py-3.5 border-2 border-dashed focus-ring"
            style={{ borderColor: "color-mix(in srgb, var(--border-color) 16%, transparent)", color: "var(--muted-foreground)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-secondary">
              <Plus size={18} strokeWidth={1.75} aria-hidden="true" />
            </div>
            <span className="text-sm font-medium">Taak toevoegen aan {room.name}</span>
          </button>
          {roomTasks.length > 0 && (
            <button
              onClick={() => openTemplates(room.id, room.iconKey)}
              className="w-full text-center text-xs font-medium text-muted-foreground py-1 focus-ring rounded-lg">
              Of kies uit snelle taken
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <div className="px-5 pt-14 pb-8">
      <PageHeader title="Huis" subtitle="Elke ruimte op z'n plek." />

      {rooms.length === 0 && (
        <div className="text-center pt-4 pb-6">
          <EmptyIllustration />
          <p className="text-sm text-muted-foreground mt-1">Nog geen kamers. Voeg er hieronder een toe.</p>
        </div>
      )}
      <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-2.5">
        {rooms.map((r) => (
          <motion.div key={r.id} variants={fadeUp}>
            <KamerKaart room={r} onClick={() => navigate(`/huis/${r.id}`)} />
          </motion.div>
        ))}
        <motion.div variants={fadeUp}>
          <motion.button onClick={openNewRoom} whileTap={{ scale: 0.985 }}
            className="w-full flex items-center gap-4 bg-card rounded-2xl px-4 py-3.5 border-2 border-dashed focus-ring"
            style={{ borderColor: "color-mix(in srgb, var(--border-color) 16%, transparent)", color: "var(--muted-foreground)" }}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 bg-secondary">
              <Plus size={20} strokeWidth={1.75} aria-hidden="true" />
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
