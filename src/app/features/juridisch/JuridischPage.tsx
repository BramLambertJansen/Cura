import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { stagger, fadeUp } from "../../lib/motion";
import { Card, IconButton, PageHeader } from "../../components/shared";
import { LAATST_BIJGEWERKT, type JuridischBlok, type JuridischDocument } from "./juridischContent";

/**
 * Renderer voor de juridische documenten (privacyverklaring, voorwaarden).
 *
 * Deze pagina's staan BUITEN de auth-gate en dus buiten MainShell — er is hier
 * geen shell die het scrollen en de safe areas al regelt, dus doet de pagina
 * dat zelf (zelfde patroon als AuthPage/AcceptInvitePage). Ze moeten ook zonder
 * account te openen zijn: een privacyverklaring die eerst inloggen vraagt is
 * geen privacyverklaring.
 */
export function JuridischPage({ doc, ander }: { doc: JuridischDocument; ander: { label: string; to: string } }) {
  const navigate = useNavigate();

  // Terug: normaal gesproken één stap in de geschiedenis (dan kom je uit waar je
  // vandaan kwam — Meer, of de inlogpagina). Bij een directe link/herlaad is er
  // geen geschiedenis om op terug te vallen, dus dan naar Meer.
  function terug() {
    if (window.history.length > 1) navigate(-1);
    else navigate("/meer", { replace: true });
  }

  // `page-safe-scroll` (theme.css) doet de safe areas — deze pagina valt buiten
  // MainShell, dus er is geen shell die dat al voor haar regelt.
  return (
    <div className="h-dvh overflow-y-auto bg-background page-safe-scroll">
      <div className="px-5 pt-14 max-w-xl mx-auto">
        <IconButton
          onClick={terug}
          label="Terug"
          tone="card"
          className="mb-4"
          icon={<ArrowLeft size={16} className="text-foreground" aria-hidden="true" />}
        />
        <PageHeader title={doc.titel} subtitle={doc.ondertitel} />

        <p className="text-sm text-muted-foreground leading-relaxed mb-2">{doc.intro}</p>
        <p className="text-xs text-muted-foreground mb-7">Laatst bijgewerkt: {LAATST_BIJGEWERKT}</p>

        <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-3">
          {doc.secties.map((sectie) => (
            <motion.section key={sectie.titel} variants={fadeUp}>
              <Card className="px-4 py-4">
                <h2 className="text-base font-medium text-foreground font-display mb-2.5">{sectie.titel}</h2>
                <div className="space-y-3">
                  {sectie.blokken.map((blok, i) => (
                    <Blok key={i} blok={blok} />
                  ))}
                </div>
              </Card>
            </motion.section>
          ))}
        </motion.div>

        <Card onClick={() => navigate(ander.to)} className="flex items-center gap-3 px-4 py-4 mt-3" ariaLabel={ander.label}>
          <span className="flex-1 text-left text-sm font-semibold text-foreground">{ander.label}</span>
          <ChevronRight size={15} className="text-muted-foreground" aria-hidden="true" />
        </Card>
      </div>
    </div>
  );
}

function Blok({ blok }: { blok: JuridischBlok }) {
  if (blok.type === "alinea") {
    return <p className="text-sm text-muted-foreground leading-relaxed">{blok.text}</p>;
  }
  if (blok.type === "lijst") {
    return (
      <ul className="space-y-1.5">
        {blok.items.map((item) => (
          <li key={item} className="flex gap-2.5 text-sm text-muted-foreground leading-relaxed">
            {/* Decoratief bolletje — de opsomming zelf komt al uit de <ul>/<li>. */}
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "color-mix(in srgb, var(--primary) 45%, transparent)" }} aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <dl className="space-y-3">
      {blok.items.map((item) => (
        <div key={item.term}>
          <dt className="text-sm font-semibold text-foreground">{item.term}</dt>
          <dd className="text-sm text-muted-foreground leading-relaxed mt-0.5">{item.text}</dd>
        </div>
      ))}
    </dl>
  );
}
