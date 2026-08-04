import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { motion } from "motion/react";
import { Check, Plus } from "lucide-react";
import { useCuraStore } from "../../../stores/useCuraStore";
import { useRoomViews, useTaskViews } from "../../../stores/useViews";
import { roomIcon, SAGE, SHADOW } from "../../lib/constants";
import { spring, stagger, fadeUp } from "../../lib/motion";
import { CollapsibleSection, HintBanner } from "../../components/shared";
import { TaakRij } from "../../components/TaakRij";
import { RoomHero } from "../../components/RoomThumb";
import { EmptyIllustration } from "../../components/EmptyIllustration";
import { useSheets } from "../../sheetContext";
import { ROOM_TEMPLATES, categoryForIconKey } from "../../lib/templates";
import { useHuisTaskActions } from "./useHuisTaskActions";

/**
 * A single room's pool of tasks (`/huis/:roomId`) — split out of the old
 * dual-purpose HuisPage (#156), which used to fold this in behind an
 * early-return on `room`. Shares only planTask/dismissWithUndo with Huis's
 * list view, via useHuisTaskActions.
 */
export function RoomDetailPage() {
  const { openEditRoom, openEditTask, openAddTask } = useSheets();
  const toggleTask = useCuraStore((s) => s.toggleTask);
  const createTasksFromTemplates = useCuraStore((s) => s.createTasksFromTemplates);
  const rooms = useRoomViews();
  const tasks = useTaskViews();
  const { handleUnclaim, isTaskDismissed, planTask, dismissWithUndo } = useHuisTaskActions(tasks);
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();
  const handleDismiss = useCallback((taskId: string) => dismissWithUndo(taskId, "deze lijst"), [dismissWithUndo]);
  // Guards the quick-add buttons against a double-tap firing two create calls
  // during the (usually brief, but non-zero in cloud mode) async gap.
  const [quickAddBusy, setQuickAddBusy] = useState(false);
  const [afgerondOpen, setAfgerondOpen] = useState(false);

  const room = rooms.find((r) => r.id === roomId);

  // A stale/deleted roomId (e.g. a bookmark, or the room was just removed)
  // has nothing to show here — bounce back to the room list instead of a
  // broken detail page, same as the old merged component's effective
  // behavior (falling through to the list when `room` was undefined).
  useEffect(() => {
    if (!room) navigate("/huis", { replace: true });
  }, [room, navigate]);
  if (!room) return null;

  const ic = roomIcon(room.iconKey);
  const allRoomTasks = tasks.filter((t) => t.roomId === room.id);
  const roomTasks = allRoomTasks.filter((t) => !isTaskDismissed(t.id));
  const open = roomTasks.filter((t) => !t.done);
  const done = roomTasks.filter((t) => t.done);
  // Up to 2 one-tap suggestions from this room's template category, skipping
  // anything already added (by title) so a suggestion disappears the moment
  // it's used instead of staying around as a now-redundant offer. Deliberately
  // off allRoomTasks, not the dismissal-filtered roomTasks: a template task
  // that's just dismissed ("niet vandaag") still exists, so it must still
  // count as "already added" — otherwise dismissing it makes the same
  // template reappear here as if it were new, and re-adding it duplicates it.
  const existingTitles = new Set(allRoomTasks.map((t) => t.title.trim().toLowerCase()));
  const quickSuggestions = ROOM_TEMPLATES[categoryForIconKey(room.iconKey)]
    .filter((t) => !existingTitles.has(t.title.trim().toLowerCase()))
    .slice(0, 2);

  return (
    <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={spring}>
      <RoomHero
        ic={ic}
        onBack={() => navigate("/huis")}
        onEdit={() => openEditRoom(room.id)}
        editLabel={`${room.name} bewerken`}
      />

      <div className="relative z-10 -mt-28 h-28 px-5 pt-3">
        <h1 className="font-display text-3xl font-medium leading-tight text-foreground">{room.name}</h1>
        {room.owner && <p className="mt-2 text-sm text-muted-foreground">Meestal {room.owner}</p>}
      </div>

      <div className="px-5 pb-6">
        <HintBanner>{room.hint}</HintBanner>
      </div>

      <div className="px-5 pb-28 space-y-3">
        {roomTasks.length === 0 ? (
          <div className="text-center pt-2 pb-4">
            <EmptyIllustration src="/states/empty-room-tasks.webp" />
            <p className="text-sm text-muted-foreground mt-1">Nog geen taken in deze kamer.</p>
          </div>
        ) : (
          <>
            {open.length > 0 && (
              <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-3">
                {open.map((t) => (
                  <motion.div key={t.id} variants={fadeUp}>
                    <TaakRij
                      task={t}
                      onToggle={toggleTask}
                      showClaim
                      onPlan={planTask}
                      onUnclaim={handleUnclaim}
                      onEdit={openEditTask}
                      onDismiss={handleDismiss}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
            {done.length > 0 && (
              <CollapsibleSection
                title="Afgerond"
                count={done.length}
                icon={<Check size={13} style={{ color: SAGE }} aria-hidden="true" />}
                open={afgerondOpen}
                onToggle={() => setAfgerondOpen((v) => !v)}>
                <div className="space-y-3">
                  {done.map((t) => (
                    <TaakRij key={t.id} task={t} onToggle={toggleTask} onEdit={openEditTask} onDismiss={handleDismiss} />
                  ))}
                </div>
              </CollapsibleSection>
            )}
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

        {quickSuggestions.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground ml-1">Snel toevoegen</p>
            {quickSuggestions.map((t) => (
              <button
                key={t.title}
                disabled={quickAddBusy}
                onClick={async () => {
                  if (quickAddBusy) return;
                  setQuickAddBusy(true);
                  try {
                    await createTasksFromTemplates(room.id, [t]);
                  } finally {
                    setQuickAddBusy(false);
                  }
                }}
                className="w-full flex items-center gap-3 bg-card rounded-2xl px-4 py-3 border border-border/60 focus-ring text-left disabled:opacity-50"
                style={{ boxShadow: SHADOW }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-secondary">
                  <Plus size={15} strokeWidth={2} aria-hidden="true" />
                </div>
                <span className="flex-1 min-w-0 text-sm font-medium text-foreground truncate">{t.title}</span>
                {t.durationMin && <span className="text-xs text-muted-foreground flex-shrink-0">{t.durationMin} min</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
