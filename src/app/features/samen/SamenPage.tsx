import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router";
import { motion } from "motion/react";
import { Check } from "lucide-react";
import { useActivityFeed, useCurrentMember } from "../../../stores/useViews";
import { SAGE } from "../../lib/constants";
import { stagger, fadeUp } from "../../lib/motion";
import { Leeg, Card, Avatar } from "../../components/shared";
import { PageHero } from "../../components/PageHero";

export function SamenPage() {
  const navigate = useNavigate();
  const location = useLocation();
  // Origin-aware back: Samen can now be reached from Vandaag's own preview
  // card as well as Meer, so "terug" must return wherever the user actually
  // came from instead of always assuming Meer. Falls back to Meer for a
  // direct link/refresh, where there's no navigation state to read.
  const cameFrom = (location.state as { from?: "vandaag" | "meer" } | null)?.from === "vandaag" ? "vandaag" : "meer";
  const me = useCurrentMember();

  const sinceIso = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, []);
  const completedToday = useActivityFeed(sinceIso);

  return (
    <div className="pb-8">
      <PageHero
        src="/headers/samen-watercolor.webp"
        title="Samen"
        // replace, not push — Samen itself was reached with a push (from Vandaag's
        // preview card or Meer's list item), so pushing again here would leave a
        // stale /samen entry in history and turn the OS/browser back gesture into
        // a Vandaag/Meer ⇄ Samen loop.
        onBack={() => navigate(cameFrom === "vandaag" ? "/vandaag" : "/meer", { replace: true })}
        backLabel={cameFrom === "vandaag" ? "Terug naar Vandaag" : "Terug naar Meer"}
      />

      <div className="px-5">
      {completedToday.length === 0
        ? <Leeg image="/states/samen-mugs-watercolor.webp" text="Nog niks gedaan vandaag." />
        : <motion.div variants={stagger} initial="initial" animate="animate" aria-live="polite" className="space-y-1.5 mb-8">
            {completedToday.map((activity, i) => {
              const activityKey = `${activity.taskId}-${activity.doneAt}`;
              const mine = !!activity.doneById && activity.doneById === me?.id;
              return (
                <motion.div key={activityKey} variants={fadeUp} className="flex gap-3 items-stretch">
                  <div className="flex flex-col items-center pt-2 flex-shrink-0">
                    <div className="relative flex-shrink-0">
                      <Avatar name={mine ? "Jij" : activity.doneBy} size={32} tone={mine ? "solid" : "soft"} />
                      <span
                        aria-hidden="true"
                        className="absolute -bottom-0.5 -right-0.5 w-[15px] h-[15px] rounded-full flex items-center justify-center"
                        style={{ background: SAGE, border: "2px solid var(--card)" }}>
                        <Check size={8} strokeWidth={3} className="text-white" />
                      </span>
                    </div>
                    {i < completedToday.length - 1 && <div className="w-px flex-1 bg-border mt-1.5" />}
                  </div>
                  <div className="flex-1 pb-3">
                    <Card>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground leading-snug">{activity.title}</p>
                        <span className="text-xs font-semibold flex-shrink-0" style={{ color: SAGE }}>{mine ? "Jij" : activity.doneBy}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {activity.room}{activity.doneAt && ` · ${new Date(activity.doneAt).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}`}
                      </p>
                    </Card>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
      }
      </div>
    </div>
  );
}
