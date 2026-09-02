import { useNavigate } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { useCuraStore } from "../../../stores/useCuraStore";
import { useTaskSuggestionViews } from "../../../stores/useViews";
import { stagger, fadeUp } from "../../lib/motion";
import { Kop, Leeg } from "../../components/shared";
import { PageHero } from "../../components/PageHero";
import { AiVoorstelRij } from "../../components/AiVoorstelRij";

/**
 * AI-voorstellen — the full owner of Phase 4's "AI-invoer via MCP" feature
 * (CLAUDE.md §5 → AI-voorstellen). No eigen navigatietab, reachable via Meer,
 * same pattern as Taken/Boodschappen/Focus. Token-beheer zelf leeft in
 * HouseholdSheet (naast Uitnodigen), niet hier — deze pagina toont alleen de
 * voorstellenlijst en verwijst er kort naartoe als er nog geen koppeling is.
 *
 * OPEN WERKPUNT: `/headers/ai-voorstellen-watercolor.webp` en
 * `/states/ai-voorstellen-empty-watercolor.webp` bestaan nog niet — beide
 * degraderen stil naar hun bestaande tekst-only fallback (PageHero/Leeg's
 * eigen onError-gedrag) tot iemand de echte aquarellen aanlevert/rendert
 * (1536x512, zonder zon/horizon voor de header — zie CLAUDE.md §5 "Gedeelde
 * overzichtsheaders").
 */
export function AiVoorstellenPage() {
  const navigate = useNavigate();
  const suggestions = useTaskSuggestionViews();
  const acceptTaskSuggestion = useCuraStore((s) => s.acceptTaskSuggestion);
  const dismissTaskSuggestion = useCuraStore((s) => s.dismissTaskSuggestion);

  return (
    <div className="pb-8">
      <PageHero
        src="/headers/ai-voorstellen-watercolor.webp"
        title="AI-voorstellen"
        onBack={() => navigate("/meer")}
        backLabel="Terug naar Meer"
      />

      <div className="px-5">
        {suggestions.length === 0 ? (
          // Copy — nog niet door Bram beoordeeld (CLAUDE.md §5 → AI-voorstellen decision 5).
          <Leeg
            image="/states/ai-voorstellen-empty-watercolor.webp"
            text="Nog geen voorstellen. Koppel een Claude via Huishouden beheren."
          />
        ) : (
          <section>
            <Kop>{suggestions.length === 1 ? "1 voorstel" : `${suggestions.length} voorstellen`}</Kop>
            <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-2.5">
              <AnimatePresence mode="popLayout" initial={false}>
                {suggestions.map((s) => (
                  <motion.div key={s.id} variants={fadeUp}>
                    <AiVoorstelRij
                      suggestion={s}
                      onAccept={() => acceptTaskSuggestion(s.id)}
                      onDismiss={() => dismissTaskSuggestion(s.id)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          </section>
        )}
      </div>
    </div>
  );
}
