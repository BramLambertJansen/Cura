import { useMemo } from "react";
import { motion } from "motion/react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { useCuraStore } from "../../../stores/useCuraStore";
import { useActivityFeed } from "../../../stores/useViews";
import { SAGE } from "../../lib/constants";
import { stagger, fadeUp } from "../../lib/motion";
import { householdStatusLine } from "../../lib/format";
import { useReacties, type ReactieKind } from "../../lib/useReacties";
import { Leeg, PageHeader, Card, HintBanner } from "../../components/shared";
import { ActiviteitReacties } from "../../components/ActiviteitReacties";

const REACTIE_TOAST: Record<ReactieKind, string> = {
  bedankt: "Bedankje verstuurd",
  mooi_gedaan: "Mooi gedaan verstuurd",
  volgende: "Genoteerd — jij pakt de volgende",
};

export function SamenPage() {
  const members = useCuraStore((s) => s.members);
  const currentUserId = useCuraStore((s) => s.currentUserId);
  const me = members.find((m) => m.userId === currentUserId);
  const { reactionFor, react } = useReacties();

  const sinceIso = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, []);
  const completedToday = useActivityFeed(sinceIso);

  return (
    <div className="px-5 pt-14 pb-8">
      <PageHeader title="Samen" subtitle="Wat is er vandaag gedaan?" />

      <div className="mb-6">
        <HintBanner tone="muted">{householdStatusLine(completedToday.length)}</HintBanner>
      </div>

      {completedToday.length === 0
        ? <Leeg icon="🤍" text="Nog niks gedaan vandaag. De dag is jong." />
        : <motion.div variants={stagger} initial="initial" animate="animate" aria-live="polite" className="space-y-1.5 mb-8">
            {completedToday.map((activity, i) => {
              const activityKey = `${activity.taskId}-${activity.doneAt}`;
              return (
                <motion.div key={activityKey} variants={fadeUp} className="flex gap-3 items-stretch">
                  <div className="flex flex-col items-center pt-2 flex-shrink-0">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: activity.doneBy === me?.displayName ? "color-mix(in srgb, var(--primary) 12%, transparent)" : "color-mix(in srgb, var(--accent) 45%, transparent)" }}>
                      <Check size={13} strokeWidth={2.5} style={{ color: SAGE }} />
                    </div>
                    {i < completedToday.length - 1 && <div className="w-px flex-1 bg-border mt-1.5" />}
                  </div>
                  <div className="flex-1 pb-3">
                    <Card>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground leading-snug">{activity.title}</p>
                        <span className="text-xs font-semibold flex-shrink-0" style={{ color: SAGE }}>{activity.doneBy}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {activity.room}{activity.doneAt && ` · ${new Date(activity.doneAt).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}`}
                      </p>
                      <ActiviteitReacties
                        reacted={reactionFor(activityKey)}
                        onReact={(kind) => { react(activityKey, kind); toast(REACTIE_TOAST[kind]); }}
                      />
                    </Card>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
      }
    </div>
  );
}
