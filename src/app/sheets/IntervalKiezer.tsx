import { motion } from "motion/react";
import { SAGE, INTERVAL_PRESETS } from "../lib/constants";
import { intervalLabel } from "../lib/format";
import { Card, OptieKaart } from "../components/shared";

export function IntervalKiezer({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const clamp = (n: number) => Math.min(365, Math.max(1, n));

  return (
    <div className="pt-3 px-1 space-y-4">
      <Card className="flex items-center justify-between gap-4 px-5 py-4">
        <div className="text-left">
          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Interval</p>
          <p className="text-sm text-foreground font-semibold mt-0.5 font-display italic">
            {intervalLabel(value)}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <motion.button whileTap={{ scale: 0.88 }}
            onClick={() => onChange(clamp(value - 1))}
            disabled={value <= 1}
            aria-label="Minder dagen"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-light disabled:opacity-30 focus-ring"
            style={{ background: "var(--input-background)", color: "var(--foreground)", boxShadow: "var(--shadow-input)" }}>
            −
          </motion.button>
          <div className="w-12 text-center">
            <motion.span
              key={value}
              initial={{ scale: 1.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 28 }}
              className="text-xl font-bold tabular-nums" style={{ color: SAGE, display: "block" }}>
              {value}
            </motion.span>
            <span className="text-[10px] text-muted-foreground leading-none">{value === 1 ? "dag" : "dagen"}</span>
          </div>
          <motion.button whileTap={{ scale: 0.88 }}
            onClick={() => onChange(clamp(value + 1))}
            disabled={value >= 365}
            aria-label="Meer dagen"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-light disabled:opacity-30 focus-ring"
            style={{ background: "var(--input-background)", color: "var(--foreground)", boxShadow: "var(--shadow-input)" }}>
            +
          </motion.button>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-2">
        {INTERVAL_PRESETS.map((p) => {
          const active = value === p.days;
          return (
            <OptieKaart key={p.days} selected={active} onClick={() => onChange(p.days)} className="py-2.5 text-center">
              <span className="text-xs font-semibold block" style={{ color: active ? SAGE : "var(--foreground)" }}>
                {p.label}
              </span>
            </OptieKaart>
          );
        })}
      </div>
    </div>
  );
}
