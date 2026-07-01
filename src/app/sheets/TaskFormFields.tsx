import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bell, CalendarDays, Check, Clock, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { SAGE } from "../lib/constants";
import { intervalLabel } from "../lib/format";
import { Kop, Toggle, VeldTextarea } from "../components/shared";
import { IntervalKiezer } from "./IntervalKiezer";
import { Calendar } from "../components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import type { RoomView } from "../../data/types";

export interface TaskFormState {
  selectedRoomId: string | null;
  herhalenAan: boolean;
  intervalDagen: number;
  wekkerAan: boolean;
  wekkerDatum: Date | undefined;
  wekkerTijd: string; // "HH:mm"
  duurMin: number | undefined;
  beschrijving: string;
}

export interface TaskFormFieldsProps extends TaskFormState {
  rooms: RoomView[];
  onRoomChange: (id: string | null) => void;
  onHerhalenChange: (v: boolean) => void;
  onIntervalChange: (v: number) => void;
  onWekkerChange: (v: boolean) => void;
  onWekkerDatumChange: (d: Date | undefined) => void;
  onWekkerTijdChange: (v: string) => void;
  onDuurMinChange: (v: number | undefined) => void;
  onBeschrijvingChange: (v: string) => void;
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
  selectedRoomId, onRoomChange,
  herhalenAan, onHerhalenChange,
  intervalDagen, onIntervalChange,
  wekkerAan, onWekkerChange,
  wekkerDatum, onWekkerDatumChange,
  wekkerTijd, onWekkerTijdChange,
  duurMin, onDuurMinChange,
  beschrijving, onBeschrijvingChange,
}: TaskFormFieldsProps) {
  const [calOpen, setCalOpen] = useState(false);

  return (
    <>
      {/* Room selection */}
      <div className="grid grid-cols-2 gap-2 mb-6">
        {rooms.map((r) => {
          const active = selectedRoomId === r.id;
          const color = r.color;
          return (
            <motion.button
              key={r.id}
              onClick={() => onRoomChange(active ? null : r.id)}
              whileTap={{ scale: 0.94 }}
              aria-pressed={active}
              aria-label={active ? `${r.name} deselecteren` : `${r.name} selecteren`}
              initial={{ backgroundColor: "var(--input-background)", borderColor: "var(--border)" }}
              animate={{
                backgroundColor: active ? color + "18" : "var(--input-background)",
                borderColor: active ? color + "60" : "var(--border)",
              }}
              transition={{ duration: 0.15 }}
              style={{ boxShadow: "var(--shadow-input)" }}
              className="flex items-center gap-2.5 px-4 py-3.5 rounded-2xl border-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--primary)_50%,transparent)]"
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
            </motion.button>
          );
        })}
      </div>

      {/* Herhalen */}
      <div className="mb-4">
        <div className="flex items-center justify-between py-3.5 px-4 rounded-2xl border border-border" style={{ background: "var(--input-background)", boxShadow: "var(--shadow-input)" }}>
          <div className="flex items-center gap-2.5">
            <RefreshCw size={16} style={{ color: herhalenAan ? SAGE : "var(--muted-foreground)" }} aria-hidden="true" />
            <span className="text-sm font-medium text-foreground">Herhalen</span>
            {herhalenAan && (
              <motion.span
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)", color: SAGE }}
              >
                {intervalLabel(intervalDagen)}
              </motion.span>
            )}
          </div>
          <Toggle checked={herhalenAan} onChange={onHerhalenChange} label="Taak herhalen" />
        </div>
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
        <div className="flex items-center justify-between py-3.5 px-4 rounded-2xl border border-border" style={{ background: "var(--input-background)", boxShadow: "var(--shadow-input)" }}>
          <div className="flex items-center gap-2.5">
            <Bell size={16} style={{ color: wekkerAan ? SAGE : "var(--muted-foreground)" }} aria-hidden="true" />
            <span className="text-sm font-medium text-foreground">Wekker</span>
            {wekkerAan && (
              <motion.span
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)", color: SAGE }}
              >
                {herhalenAan ? wekkerTijd : wekkerDatum ? format(wekkerDatum, "d MMM", { locale: nl }) : wekkerTijd}
              </motion.span>
            )}
          </div>
          <Toggle checked={wekkerAan} onChange={onWekkerChange} label="Wekker instellen" />
        </div>

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
                          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-border text-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--primary)_50%,transparent)]"
                          style={{ background: "var(--input-background)", boxShadow: "var(--shadow-input)" }}
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
                  <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-border" style={{ background: "var(--input-background)", boxShadow: "var(--shadow-input)" }}>
                    <Clock size={16} style={{ color: SAGE }} aria-hidden="true" />
                    <input
                      type="time"
                      value={wekkerTijd}
                      onChange={(e) => onWekkerTijdChange(e.target.value)}
                      aria-label="Wekker-tijdstip"
                      className="flex-1 bg-transparent text-sm text-foreground outline-none focus-visible:ring-0"
                    />
                  </div>
                </div>

                <p className="text-xs text-muted-foreground px-1 leading-relaxed">
                  We laten het je rustig weten, zolang de app open staat.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Duur */}
      <div className="mb-6">
        <Kop>Duur <span style={{ fontStyle: "normal", opacity: 0.7 }}>(optioneel)</span></Kop>
        <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-border" style={{ background: "var(--input-background)", boxShadow: "var(--shadow-input)" }}>
          <input
            type="number"
            min={1}
            max={480}
            value={duurMin ?? ""}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              onDuurMinChange(isNaN(v) || v <= 0 ? undefined : v);
            }}
            placeholder="bijv. 10"
            aria-label="Duur in minuten"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none"
          />
          <span className="text-xs text-muted-foreground flex-shrink-0">min</span>
        </div>
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
