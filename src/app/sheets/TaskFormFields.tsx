import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bell, CalendarDays, Check, Clock, Play, RefreshCw, Sun } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { SAGE } from "../lib/constants";
import { intervalLabel } from "../lib/format";
import { Kop, Toggle, VeldTextarea, FieldShell, StatusBadge, OptieKaart, TaakToevoegRij, KeuzeChip, fieldBorderColor, fieldBoxShadow } from "../components/shared";
import { IntervalKiezer } from "./IntervalKiezer";
import { ChecklistItemRij } from "./ChecklistItemRij";
import { Calendar } from "../components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import type { RoomView, ChecklistItem } from "../../data/types";

export interface TaskFormState {
  selectedRoomId: string | null;
  opMijnDag: boolean;
  herhalenAan: boolean;
  intervalDagen: number;
  wekkerAan: boolean;
  wekkerDatum: Date | undefined;
  wekkerTijd: string; // "HH:mm"
  duurMin: number | undefined;
  beschrijving: string;
  gestartAan: boolean;
  checklistItems: ChecklistItem[];
  dagdeel: "ochtend" | "middag" | "avond" | undefined;
}

export interface TaskFormFieldsProps extends TaskFormState {
  rooms: RoomView[];
  showDayToggle?: boolean;
  onRoomChange: (id: string | null) => void;
  onOpMijnDagChange: (v: boolean) => void;
  onHerhalenChange: (v: boolean) => void;
  onIntervalChange: (v: number) => void;
  onWekkerChange: (v: boolean) => void;
  onWekkerDatumChange: (d: Date | undefined) => void;
  onWekkerTijdChange: (v: string) => void;
  onDuurMinChange: (v: number | undefined) => void;
  onBeschrijvingChange: (v: string) => void;
  onGestartChange: (v: boolean) => void;
  onChecklistItemsChange: (items: ChecklistItem[]) => void;
  onDagdeelChange: (v: "ochtend" | "middag" | "avond" | undefined) => void;
}

/** Combines a selected date and HH:mm string into a full ISO timestamp. */
export function buildDueDate(
  wekkerAan: boolean,
  herhalenAan: boolean,
  wekkerDatum: Date | undefined,
  wekkerTijd: string,
): string | undefined {
  if (!wekkerAan) return undefined;
  const [h, m] = wekkerTijd.split(":").map(Number);
  const base = herhalenAan ? new Date() : (wekkerDatum ?? new Date());
  return new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, m, 0, 0).toISOString();
}

/** Extracts "HH:mm" from an ISO date string. */
export function extractTijd(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

export function TaskFormFields({
  rooms,
  showDayToggle = true,
  selectedRoomId, onRoomChange,
  opMijnDag, onOpMijnDagChange,
  herhalenAan, onHerhalenChange,
  intervalDagen, onIntervalChange,
  wekkerAan, onWekkerChange,
  wekkerDatum, onWekkerDatumChange,
  wekkerTijd, onWekkerTijdChange,
  duurMin, onDuurMinChange,
  beschrijving, onBeschrijvingChange,
  gestartAan, onGestartChange,
  checklistItems, onChecklistItemsChange,
  dagdeel, onDagdeelChange,
}: TaskFormFieldsProps) {
  const [calOpen, setCalOpen] = useState(false);
  const [tijdActive, setTijdActive] = useState(false);
  const [duurActive, setDuurActive] = useState(false);
  const [checklistInput, setChecklistInput] = useState("");

  return (
    <>
      {/* Op mijn dag — makes the task show up in "Mijn dag" on Vandaag right away,
          instead of quietly landing only in the shared pool. */}
      {showDayToggle && (
        <div className="mb-4">
          <FieldShell hasValue={opMijnDag} className="flex items-center justify-between py-3.5 px-4">
            <div className="flex items-center gap-2.5">
              <Sun size={16} style={{ color: opMijnDag ? SAGE : "var(--muted-foreground)" }} aria-hidden="true" />
              <span className="text-sm font-medium text-foreground">Zet op mijn dag</span>
            </div>
            <Toggle checked={opMijnDag} onChange={onOpMijnDagChange} label="Zet op mijn dag" />
          </FieldShell>
        </div>
      )}

      {/* Room selection */}
      <div className="grid grid-cols-2 gap-2 mb-6">
        {rooms.map((r) => {
          const active = selectedRoomId === r.id;
          const color = r.color;
          return (
            <OptieKaart
              key={r.id}
              selected={active}
              onClick={() => onRoomChange(active ? null : r.id)}
              tint={color}
              selectedBg={9}
              selectedBorder={38}
              ariaLabel={active ? `${r.name} deselecteren` : `${r.name} selecteren`}
              className="flex items-center gap-2.5 px-4 py-3.5 text-left"
            >
              <motion.span
                animate={{
                  color: active ? "var(--foreground)" : "var(--muted-foreground)",
                  fontWeight: active ? 600 : 500,
                }}
                transition={{ duration: 0.15 }}
                className="text-sm"
              >
                {r.name}
              </motion.span>
              {active && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="ml-auto flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center"
                  style={{ background: color }}
                >
                  <Check size={9} strokeWidth={3} className="text-white" aria-hidden="true" />
                </motion.div>
              )}
            </OptieKaart>
          );
        })}
      </div>

      {/* Wanneer — los, optioneel dagdeel-label; volledig onafhankelijk van de
          Wekker hieronder. De gebruiker spreekt hier zijn eigen intentie uit
          ("dit is ruwweg een ochtend-dingetje"), de app verzint niets (§2:
          eerlijkheid boven precisie) — vandaar geen verplichte keuze en geen
          default: tikken op een al geselecteerd segment deselecteert het weer. */}
      <div className="mb-6">
        <Kop>Wanneer <span style={{ fontStyle: "normal", opacity: 0.7 }}>(optioneel)</span></Kop>
        <div role="group" aria-label="Wanneer" className="flex gap-2">
          {(["ochtend", "middag", "avond"] as const).map((key) => (
            <KeuzeChip key={key} selected={dagdeel === key} onClick={() => onDagdeelChange(dagdeel === key ? undefined : key)}>
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </KeuzeChip>
          ))}
        </div>
      </div>

      {/* Herhalen */}
      <div className="mb-4">
        <FieldShell hasValue={herhalenAan} className="flex items-center justify-between py-3.5 px-4">
          <div className="flex items-center gap-2.5">
            <RefreshCw size={16} style={{ color: herhalenAan ? SAGE : "var(--muted-foreground)" }} aria-hidden="true" />
            <span className="text-sm font-medium text-foreground">Herhalen</span>
            {herhalenAan && (
              <StatusBadge enter="slide">{intervalLabel(intervalDagen)}</StatusBadge>
            )}
          </div>
          <Toggle checked={herhalenAan} onChange={onHerhalenChange} label="Taak herhalen" />
        </FieldShell>
        <AnimatePresence initial={false}>
          {herhalenAan && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ type: "spring", stiffness: 360, damping: 34 }}
              className="overflow-hidden"
            >
              <IntervalKiezer value={intervalDagen} onChange={onIntervalChange} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Wekker */}
      <div className="mb-4">
        <FieldShell hasValue={wekkerAan} className="flex items-center justify-between py-3.5 px-4">
          <div className="flex items-center gap-2.5">
            <Bell size={16} style={{ color: wekkerAan ? SAGE : "var(--muted-foreground)" }} aria-hidden="true" />
            <span className="text-sm font-medium text-foreground">Wekker</span>
            {wekkerAan && (
              <StatusBadge enter="slide">
                {herhalenAan ? wekkerTijd : wekkerDatum ? format(wekkerDatum, "d MMM", { locale: nl }) : wekkerTijd}
              </StatusBadge>
            )}
          </div>
          <Toggle checked={wekkerAan} onChange={onWekkerChange} label="Wekker instellen" />
        </FieldShell>

        <AnimatePresence initial={false}>
          {wekkerAan && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ type: "spring", stiffness: 360, damping: 34 }}
              className="overflow-hidden"
            >
              <div className="pt-3 space-y-3 px-1">
                {/* Date picker — only for one-off tasks */}
                {!herhalenAan && (
                  <div>
                    <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mb-2 ml-1">Datum</p>
                    <Popover open={calOpen} onOpenChange={setCalOpen}>
                      <PopoverTrigger asChild>
                        <motion.button
                          whileTap={{ scale: 0.98 }}
                          aria-label="Deadline-datum kiezen"
                          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-sm text-left transition-all"
                          style={{
                            background: "var(--input-background)",
                            borderColor: fieldBorderColor({ active: calOpen, hasValue: !!wekkerDatum }),
                            boxShadow: fieldBoxShadow({ active: calOpen }),
                            transition: "box-shadow 0.18s ease, border-color 0.18s ease",
                          }}
                        >
                          <CalendarDays size={16} style={{ color: wekkerDatum ? SAGE : "var(--muted-foreground)" }} aria-hidden="true" />
                          <span style={{ color: wekkerDatum ? "var(--foreground)" : "var(--muted-foreground)" }}>
                            {wekkerDatum
                              ? format(wekkerDatum, "EEEE d MMMM yyyy", { locale: nl })
                              : "Kies een datum"}
                          </span>
                        </motion.button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={wekkerDatum}
                          onSelect={(d) => { onWekkerDatumChange(d); setCalOpen(false); }}
                          disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}

                {/* Time input */}
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mb-2 ml-1">
                    {herhalenAan ? "Herinner me elke dag om" : "Tijdstip"}
                  </p>
                  <FieldShell active={tijdActive} hasValue={!!wekkerTijd} className="flex items-center gap-3 px-4 py-3.5">
                    <Clock size={16} style={{ color: SAGE }} aria-hidden="true" />
                    <input
                      type="time"
                      value={wekkerTijd}
                      onChange={(e) => onWekkerTijdChange(e.target.value)}
                      onFocus={() => setTijdActive(true)}
                      onBlur={() => setTijdActive(false)}
                      aria-label="Wekker-tijdstip"
                      className="flex-1 bg-transparent text-sm text-foreground outline-none"
                    />
                  </FieldShell>
                </div>

                <p className="text-xs text-muted-foreground px-1 leading-relaxed">
                  We laten het je rustig weten — ook als de app dicht staat, zodra je meldingen hebt aangezet.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Gestart — handmatige "ik ben begonnen"-markering, los van de checklist */}
      <div className="mb-4">
        <FieldShell hasValue={gestartAan} className="flex items-center justify-between py-3.5 px-4">
          <div className="flex items-center gap-2.5">
            <Play size={16} style={{ color: gestartAan ? SAGE : "var(--muted-foreground)" }} aria-hidden="true" />
            <span className="text-sm font-medium text-foreground">Gestart</span>
            {gestartAan && <StatusBadge enter="slide">Bezig</StatusBadge>}
          </div>
          <Toggle checked={gestartAan} onChange={onGestartChange} label="Taak als gestart markeren" />
        </FieldShell>
      </div>

      {/* Duur */}
      <div className="mb-6">
        <Kop>Duur <span style={{ fontStyle: "normal", opacity: 0.7 }}>(optioneel)</span></Kop>
        <FieldShell active={duurActive} hasValue={duurMin !== undefined} className="flex items-center gap-3 px-4 py-3.5">
          <input
            type="number"
            min={1}
            max={480}
            value={duurMin ?? ""}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              onDuurMinChange(isNaN(v) || v <= 0 ? undefined : Math.min(480, v));
            }}
            onFocus={() => setDuurActive(true)}
            onBlur={() => setDuurActive(false)}
            placeholder="bijv. 10"
            aria-label="Duur in minuten"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none"
          />
          <span className="text-xs text-muted-foreground flex-shrink-0">min</span>
        </FieldShell>
      </div>

      {/* Checklist — subtaken; afvinken zet de taak automatisch op "Bezig"
          (useCuraStore.createTask/updateTask), los van de hoofd-checkbox. */}
      <div className="mb-6">
        <Kop>Checklist <span style={{ fontStyle: "normal", opacity: 0.7 }}>(optioneel)</span></Kop>
        <div className="space-y-2 mb-3 max-h-64 overflow-y-auto scrollbar-hide">
          <AnimatePresence>
            {checklistItems.map((item, i) => (
              <ChecklistItemRij
                key={item.id}
                item={item}
                onToggle={() => onChecklistItemsChange(checklistItems.map((it, j) => (j === i ? { ...it, checked: !it.checked } : it)))}
                onTitleChange={(title) => onChecklistItemsChange(checklistItems.map((it, j) => (j === i ? { ...it, title } : it)))}
                onRemove={() => onChecklistItemsChange(checklistItems.filter((_, j) => j !== i))}
              />
            ))}
          </AnimatePresence>
        </div>
        <TaakToevoegRij
          value={checklistInput}
          onChange={setChecklistInput}
          onAdd={() => {
            if (!checklistInput.trim()) return;
            onChecklistItemsChange([...checklistItems, { id: crypto.randomUUID(), title: checklistInput.trim(), checked: false }]);
            setChecklistInput("");
          }}
          placeholder="Subtaak toevoegen…"
          ariaLabel="Checklist-item toevoegen"
        />
      </div>

      {/* Beschrijving */}
      <div className="mb-6">
        <Kop>Beschrijving <span style={{ fontStyle: "normal", opacity: 0.7 }}>(optioneel)</span></Kop>
        <VeldTextarea
          value={beschrijving}
          onChange={onBeschrijvingChange}
          placeholder="Bijv. vergeet het groentevak niet"
          ariaLabel="Beschrijving"
        />
      </div>
    </>
  );
}
