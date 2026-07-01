import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence } from "motion/react";
import { Plus, Link2, Home, Bell, ChevronRight } from "lucide-react";
import type { RoomView, RoutineView, TaskView } from "../../../data/types";
import {
  Avatar, Card, Checkbox, DubbelKnop, GroupCard, HintBanner, IconBadge, InstRij, Leeg,
  PillButton, RingProgress, Sheet, SheetHeader, Toggle, VeldInput, VeldTextarea,
} from "../../components/shared";
import { TaakRij } from "../../components/TaakRij";
import { SuggestieRij } from "../../components/SuggestieRij";
import { KamerKaart } from "../../components/KamerKaart";
import { Logo } from "../../components/Logo";
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
      <h2 className="text-lg font-medium text-foreground" style={{ fontFamily: "Lora,Georgia,serif" }}>{title}</h2>
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
  const [veld, setVeld] = useState("");
  const [veldTextarea, setVeldTextarea] = useState("");
  const [showSheet, setShowSheet] = useState(false);
  const [reactie, setReactie] = useState<ReactieKind | undefined>(undefined);

  return (
    <div className="px-5 pt-14 pb-16 space-y-10">
      <div>
        <h1 className="text-[2rem] font-medium text-foreground leading-tight" style={{ fontFamily: "Lora,Georgia,serif" }}>Design system</h1>
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
        <DubbelKnop onCancel={() => {}} onConfirm={() => {}} label="Opslaan" />
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

      <Section title="Hint banner">
        <HintBanner>Badkamer is waarschijnlijk weer toe.</HintBanner>
        <HintBanner tone="muted">"Rustig en gestaag — dat is het ritme dat telt."</HintBanner>
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
        <Leeg icon="🌿" text="Niets op de planning. Geniet ervan." />
      </Section>

      <Section title="Laden">
        <p className="text-sm text-muted-foreground -mt-1 mb-1">Rustige placeholders tijdens auth/init/route-laden — geen spinners, geen layout shift.</p>
        <CardSkeleton />
        <ListSkeleton count={2} />
      </Section>

      <Section title="Taakrij">
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
          <p className="text-xs text-muted-foreground mb-2">Kamerkaart</p>
          <KamerKaart room={demoRoom} onClick={() => {}} />
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
