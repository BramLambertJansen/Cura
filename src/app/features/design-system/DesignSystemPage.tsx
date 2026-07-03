import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence } from "motion/react";
import { Plus, Link2, Home, Bell, ChevronRight, ChevronLeft, ArrowLeft, X } from "lucide-react";
import type { RoomView, RoutineView, TaskView } from "../../../data/types";
import {
  Avatar, Card, Checkbox, DubbelKnop, GroupCard, HintBanner, IconBadge, IconButton, InstRij, KeuzeChip, Leeg,
  OptieKaart, PillButton, PrimaryButton, RingProgress, Sheet, SheetHeader, StatusBadge, TaakToevoegRij,
  Toggle, VeldInput, VeldTextarea, VerwijderKnop,
} from "../../components/shared";
import { TaakRij } from "../../components/TaakRij";
import { SuggestieRij } from "../../components/SuggestieRij";
import { KamerKaart } from "../../components/KamerKaart";
import { KamerKunstKiezer } from "../../components/KamerKunstKiezer";
import { RoomHero, RoomThumb } from "../../components/RoomThumb";
import { EmptyIllustration } from "../../components/EmptyIllustration";
import { roomIcon } from "../../lib/constants";
import { Logo } from "../../components/Logo";
import { LandingHeader } from "../../components/LandingHeader";
import { PageBanner } from "../../components/PageBanner";
import { RoutineKaart, RoutineKaartCompact } from "../../components/RoutineKaart";
import { CardSkeleton, ListSkeleton } from "../../components/Skeletons";
import { ActiviteitReacties } from "../../components/ActiviteitReacties";
import type { ReactieKind } from "../../lib/useReacties";

/**
 * Living style guide — not a tab, no route in BottomNav. Visit /dev/design-system
 * directly. Every uniform building block lives here so a restyle or new theme
 * starts from one page, not a hunt through every screen (CLAUDE.md §7).
 */

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3.5">
      <h2 className="text-lg font-medium text-foreground font-display">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Swatch({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl flex-shrink-0 border border-border/50" style={{ background: value }} />
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground font-mono">{value}</p>
      </div>
    </div>
  );
}

const demoTaskOpen: TaskView = { id: "t1", title: "Stofzuigen woonkamer", room: "Woonkamer", duration: "10 min", intervalDays: 7, planned: true, done: false };
const demoTaskClaimed: TaskView = { ...demoTaskOpen, id: "t2", title: "Planten water geven", claimedBy: "Stéphanie", intervalDays: 3 };
const demoTaskDone: TaskView = { ...demoTaskOpen, id: "t3", title: "Vaatwasser uitruimen", done: true, doneBy: "Bram", doneAt: "08:42" };

const demoRoom: RoomView = {
  id: "r1", name: "Keuken", iconKey: "utensils", color: "#B8924A", owner: "Bram",
  tasks: [demoTaskOpen], openCount: 2, hint: "Waarschijnlijk weer toe aan een beurt",
};

// A room type without watercolor art — shows the tinted-icon fallback banner.
const demoRoomNoArt: RoomView = {
  id: "r2", name: "Kantoor", iconKey: "monitor", color: "#7A6448",
  tasks: [], openCount: 0, hint: "Nog even goed",
};

const demoRoutine: RoutineView = {
  id: "ro1", name: "Ochtendroutine", trigger: "'s Ochtends",
  tasks: [
    { ...demoTaskDone, id: "rt1", title: "Bed opmaken" },
    { ...demoTaskOpen, id: "rt2", title: "Planten water geven" },
  ],
  doneInWindow: 11, windowSize: 14, windowLabel: "ochtenden", hint: "Zit lekker in je ritme",
};

export function DesignSystemPage() {
  const [checked, setChecked] = useState(true);
  const [toggled, setToggled] = useState(false);
  const [chip, setChip] = useState("a");
  const [kamerKey, setKamerKey] = useState("utensils");
  const [veld, setVeld] = useState("");
  const [veldTextarea, setVeldTextarea] = useState("");
  const [showSheet, setShowSheet] = useState(false);
  const [reactie, setReactie] = useState<ReactieKind | undefined>(undefined);
  const [optie, setOptie] = useState(true);
  const [taak, setTaak] = useState("");

  return (
    <div className="px-5 pt-14 pb-16 space-y-10">
      <div>
        <h1 className="text-[2rem] font-medium text-foreground leading-tight font-display">Design system</h1>
        <p className="text-sm text-muted-foreground mt-1.5">Alle uniforme bouwstenen op één plek — restylen of een nieuw thema beginnen hier.</p>
      </div>

      <Section title="Merk">
        <div className="flex items-end gap-4">
          <Logo size={36} className="rounded-lg" />
          <Logo size={56} className="rounded-xl" />
          <Logo size={80} className="rounded-2xl" />
        </div>
        <p className="text-xs text-muted-foreground font-mono">public/logo.svg — ook favicon en PWA-icoon</p>
      </Section>

      <Section title="Landingsheader">
        <p className="text-sm text-muted-foreground -mt-1">Volledig-breed illustratie-blok boven auth/onboarding-schermen — valt terug op alleen logo + titel als <code>public/landing-header.webp</code> ontbreekt.</p>
        <div className="rounded-2xl overflow-hidden border border-border/50">
          <LandingHeader subtitle="Rustig plannen, samen." />
        </div>
      </Section>

      <Section title="Page banner">
        <p className="text-sm text-muted-foreground -mt-1">Decoratieve aquarel-backdrop achter een paginakop (<code>PageBanner</code>) — absoluut gepositioneerd, vervaagt onderaan naar de achtergrond. Rendert niets als het beeld ontbreekt.</p>
        <div className="relative rounded-2xl overflow-hidden border border-border/50 h-40">
          <PageBanner src="/landing-header.webp" className="h-40" position="72% 35%" />
          <div className="relative px-5 pt-10">
            <h1 className="text-[1.6rem] font-medium text-foreground font-display">Goedemorgen</h1>
            <p className="text-sm text-muted-foreground mt-1">De kop blijft leesbaar zonder scrim.</p>
          </div>
        </div>
      </Section>

      <Section title="Kleuren">
        <p className="text-sm text-muted-foreground -mt-1">Alles hieronder wijst naar <code>src/styles/theme.css</code> — pas daar een token aan en elk component dat ernaar verwijst volgt automatisch.</p>
        <Swatch label="Primair (Sage)" value="var(--primary)" />
        <Swatch label="Achtergrond" value="var(--background)" />
        <Swatch label="Kaart" value="var(--card)" />
        <Swatch label="Secundair" value="var(--secondary)" />
        <Swatch label="Invoerveld" value="var(--input-background)" />
        <Swatch label="Rand" value="var(--border)" />
        <Swatch label="Destructief" value="var(--destructive)" />
        <div>
          <p className="text-sm font-medium text-foreground mb-1.5">Gradient (primair)</p>
          <div className="w-full h-10 rounded-xl border border-border/50" style={{ background: "var(--gradient-primary)" }} />
          <p className="text-xs text-muted-foreground font-mono mt-1">var(--gradient-primary)</p>
        </div>
        <div className="flex gap-4">
          <div className="flex-1 rounded-2xl bg-card border border-border/50 h-12" style={{ boxShadow: "var(--shadow-card)" }} />
          <div className="flex-1 rounded-2xl bg-card border border-border/50 h-12" style={{ boxShadow: "var(--shadow-card-lg)" }} />
        </div>
        <p className="text-xs text-muted-foreground font-mono">var(--shadow-card) · var(--shadow-card-lg)</p>
      </Section>

      <Section title="Page header">
        <p className="text-sm text-muted-foreground">Zie <code>PageHeader</code> in <code>shared.tsx</code> — titel + ondertitel + optionele actie, gebruikt boven Huis, Routines en Samen.</p>
      </Section>

      <Section title="Knoppen">
        <div className="flex flex-wrap gap-3 items-center">
          <PillButton onClick={() => {}} icon={<Plus size={14} strokeWidth={2.5} />}>Nieuw</PillButton>
          <PillButton onClick={() => {}} size="sm">Ik pak dit</PillButton>
        </div>
        <p className="text-xs text-muted-foreground">PrimaryButton — volledige-breedte gradient-CTA (auth, onboarding, uitnodigen); glow via <code>--shadow-cta</code></p>
        <PrimaryButton onClick={() => {}}>Volgende</PrimaryButton>
        <PrimaryButton onClick={() => {}} icon={<Plus size={15} />}>Met icoon</PrimaryButton>
        <PrimaryButton onClick={() => {}} disabled>Uitgeschakeld</PrimaryButton>
        <DubbelKnop onCancel={() => {}} onConfirm={() => {}} label="Opslaan" />
        <div>
          <p className="text-xs text-muted-foreground mb-1.5">VerwijderKnop — klapt om naar een inline bevestigingsrij</p>
          <VerwijderKnop label="Voorbeeld verwijderen" onConfirm={() => {}} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1.5">IconButton — ronde icoon-knop (sluiten, terug); <code>tone</code> secondary/card, <code>size</code> 8/9/10</p>
          <div className="flex items-center gap-3">
            <IconButton onClick={() => {}} label="Sluiten" icon={<X size={15} className="text-muted-foreground" aria-hidden="true" />} />
            <IconButton onClick={() => {}} label="Terug" tone="card" icon={<ArrowLeft size={16} className="text-foreground" aria-hidden="true" />} />
            <IconButton size={8} onClick={() => {}} label="Terug (klein)" icon={<ChevronLeft size={16} className="text-muted-foreground" aria-hidden="true" />} />
          </div>
        </div>
      </Section>

      <Section title="Avatar">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar name="Bram" tone="solid" serif size={56} shape="rounded" />
          <Avatar name="Stéphanie" tone="soft" size={40} />
          <Avatar name="Jij" tone="softStrong" size={40} />
        </div>
      </Section>

      <Section title="Icon badge">
        <div className="flex flex-wrap items-center gap-3">
          <IconBadge icon={<Link2 size={16} />} />
          <IconBadge icon={<Home size={16} />} tone="muted" />
        </div>
      </Section>

      <Section title="Statusbadge">
        <p className="text-sm text-muted-foreground -mt-1">Kleine sage-pill — "Klaar" op een afgeronde routine, of een interval/wekker-label bij een veldrij. <code>enter</code> kiest de animatie (pop/slide).</p>
        <div className="flex flex-wrap gap-2 items-center">
          <StatusBadge>Klaar</StatusBadge>
          <StatusBadge enter="slide">Wekelijks</StatusBadge>
        </div>
      </Section>

      <Section title="Hint banner">
        <HintBanner>Badkamer is waarschijnlijk weer toe.</HintBanner>
        <HintBanner tone="muted">"Rustig en gestaag — dat is het ritme dat telt."</HintBanner>
      </Section>

      <Section title="Keuzechip">
        <p className="text-sm text-muted-foreground -mt-1">Selecteerbare pill voor kies-één-rijen (moment, eigenaar, soort ruimte) — sage wanneer geselecteerd, <code>aria-pressed</code> ingebouwd.</p>
        <div className="flex flex-wrap gap-2">
          <KeuzeChip selected={chip === "a"} onClick={() => setChip("a")}>'s Ochtends</KeuzeChip>
          <KeuzeChip selected={chip === "b"} onClick={() => setChip("b")}>'s Middags</KeuzeChip>
          <KeuzeChip selected={chip === "c"} onClick={() => setChip("c")}>'s Avonds</KeuzeChip>
        </div>
      </Section>

      <Section title="Optiekaart">
        <p className="text-sm text-muted-foreground -mt-1">Grotere selecteerbare tegel (kamer-grid, interval-presets) — <code>border-2</code> + geanimeerde tint, kleurbaar via <code>tint</code>. De §7-vervanger voor eigen chip-varianten per sheet.</p>
        <div className="grid grid-cols-3 gap-2">
          <OptieKaart selected={optie} onClick={() => setOptie(true)} ariaLabel="Wekelijks" className="py-2.5 text-center">
            <span className="text-xs font-semibold block text-foreground">Wekelijks</span>
          </OptieKaart>
          <OptieKaart selected={!optie} onClick={() => setOptie(false)} ariaLabel="Maandelijks" className="py-2.5 text-center">
            <span className="text-xs font-semibold block text-foreground">Maandelijks</span>
          </OptieKaart>
        </div>
      </Section>

      <Section title="Checkbox & toggle">
        <div className="flex items-center gap-6">
          <Checkbox checked={checked} onToggle={() => setChecked((v) => !v)} label="Voorbeeldtaak" />
          <Toggle checked={toggled} onChange={setToggled} label="Voorbeeldinstelling" />
        </div>
      </Section>

      <Section title="Ring progress">
        <div className="flex items-center gap-4">
          <RingProgress value={0.25} />
          <RingProgress value={0.75} />
          <RingProgress value={1} />
        </div>
      </Section>

      <Section title="Veld">
        <VeldInput value={veld} onChange={setVeld} placeholder="Taaknaam" />
        <VeldTextarea value={veldTextarea} onChange={setVeldTextarea} placeholder="Beschrijving (optioneel)" />
        <p className="text-xs text-muted-foreground">TaakToevoegRij — veld + sage "+"-knop voor het opbouwen van een routine-takenlijst</p>
        <TaakToevoegRij value={taak} onChange={setTaak} onAdd={() => setTaak("")} placeholder="Taak omschrijving…" />
      </Section>

      <Section title="Sheet">
        <p className="text-sm text-muted-foreground -mt-1">Elk detailscherm bouwt op deze sheet — sleep de greep bovenaan omlaag om te sluiten, of gebruik de X-knop of Escape.</p>
        <PillButton onClick={() => setShowSheet(true)}>Open sheet</PillButton>
        {createPortal(
          <AnimatePresence>
            {showSheet && (
              <div className="fixed inset-0 z-50">
                <Sheet onClose={() => setShowSheet(false)}>
                  <SheetHeader title="Sheet" onClose={() => setShowSheet(false)} />
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Sleep de greep omlaag om te sluiten — past een eindje terug als je niet ver genoeg sleept.
                  </p>
                </Sheet>
              </div>
            )}
          </AnimatePresence>,
          document.body,
        )}
      </Section>

      <Section title="Lege staat">
        <p className="text-sm text-muted-foreground -mt-1">Met illustratie (<code>image</code>-prop) waar er kunst voor bestaat; het emoji blijft de stille fallback als het bestand ontbreekt.</p>
        <Leeg icon="🌿" image="/empty-plants.webp" text="Niets op de planning. Geniet ervan." />
        <Leeg icon="🤍" image="/samen-mugs.webp" imageAspect="wide" text="Nog niks gedaan vandaag. De dag is jong." />
        <Leeg icon="🌿" text="Zonder illustratie — emoji-fallback." />
      </Section>

      <Section title="Laden">
        <p className="text-sm text-muted-foreground -mt-1 mb-1">Rustige placeholders tijdens auth/init/route-laden — geen spinners, geen layout shift.</p>
        <CardSkeleton />
        <ListSkeleton count={2} />
      </Section>

      <Section title="Taakrij">
        <p className="text-sm text-muted-foreground -mt-1">Veeg een rij naar rechts om af te vinken (of terug te zetten) — de checkbox blijft de toetsenbord/screenreader-route.</p>
        <div className="space-y-2.5">
          <TaakRij task={demoTaskOpen} onToggle={() => {}} />
          <TaakRij task={demoTaskClaimed} onToggle={() => {}} showClaim onClaim={() => {}} />
          <TaakRij task={demoTaskDone} onToggle={() => {}} />
        </div>
      </Section>

      <Section title="Suggestie (Vandaag)">
        <SuggestieRij task={{ ...demoTaskOpen, dueHint: "Waarschijnlijk weer toe" }} onPlan={() => {}} onNietVandaag={() => {}} />
      </Section>

      <Section title="Activiteit-reacties (Samen)">
        <div className="space-y-2.5">
          <Card>
            <p className="text-sm font-semibold text-foreground">Onbeantwoord</p>
            <ActiviteitReacties reacted={reactie} onReact={setReactie} />
          </Card>
          <Card>
            <p className="text-sm font-semibold text-foreground">Beantwoord</p>
            <ActiviteitReacties reacted="bedankt" onReact={() => {}} />
          </Card>
        </div>
      </Section>

      <Section title="Kaarten">
        <div>
          <p className="text-xs text-muted-foreground mb-2">Card — algemene kaart-chrome, gebruik dit i.p.v. bg-card/border/shadow zelf opnieuw te schrijven</p>
          <div className="space-y-2.5">
            <Card>Statische kaart-inhoud</Card>
            <Card onClick={() => {}} className="flex items-center justify-between px-4 py-3.5">
              <span className="text-sm font-medium text-foreground">Tikbare kaart</span>
              <ChevronRight size={15} className="text-muted-foreground" aria-hidden="true" />
            </Card>
          </div>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-2">Kamerkaart — full-bleed aquarel links die naar de kaart vervaagt; valt terug op een getinte wash met lijn-icoon als er geen kunst is</p>
          <div className="space-y-3">
            <KamerKaart room={demoRoom} onClick={() => {}} />
            <KamerKaart room={demoRoomNoArt} onClick={() => {}} />
          </div>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-2">Kamer-kiezer — selecteerbare aquarel-tegels (kunst waar die bestaat, anders het getinte lijn-icoon), gedeeld door de nieuwe/bewerk-kamer-sheets</p>
          <KamerKunstKiezer value={kamerKey} onChange={setKamerKey} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-2">RoomThumb — illustratie met fallback naar het lijn-icoon als het beeld ontbreekt</p>
          <div className="flex items-center gap-3">
            <RoomThumb ic={roomIcon("utensils")} color={roomIcon("utensils").color} className="w-14 h-14" />
            <RoomThumb ic={roomIcon("droplets")} color={roomIcon("droplets").color} className="w-14 h-14" />
            <RoomThumb ic={roomIcon("bed")} color={roomIcon("bed").color} className="w-14 h-14" />
            <RoomThumb ic={roomIcon("monitor")} color={roomIcon("monitor").color} className="w-14 h-14" />
          </div>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-2">RoomHero — full-bleed kamer-header met zwevende terug/bewerk-knoppen; valt terug op een kale knoppenbalk als het beeld ontbreekt</p>
          <div className="relative overflow-hidden rounded-2xl">
            <RoomHero ic={roomIcon("utensils")} onBack={() => {}} onEdit={() => {}} editLabel="Kamer bewerken" />
          </div>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-2">EmptyIllustration — rustige lege staat</p>
          <EmptyIllustration />
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-2">Routinekaart — compact & uitgeklapt</p>
          <div className="space-y-3">
            <RoutineKaartCompact routine={demoRoutine} onToggleTask={() => {}} />
            <RoutineKaart routine={demoRoutine} onToggleTask={() => {}} onEdit={() => {}} />
          </div>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-2">GroupCard — rijen gegroepeerd met scheidingslijnen, voor lijsten in sheets (Profiel, Huishouden)</p>
          <GroupCard>
            <InstRij icon={<Bell size={15} />} label="Meldingen" right={<ChevronRight size={14} className="text-muted-foreground" />} />
            <InstRij icon={<Home size={15} />} label="Account" right={<ChevronRight size={14} className="text-muted-foreground" />} />
          </GroupCard>
        </div>
      </Section>
    </div>
  );
}
