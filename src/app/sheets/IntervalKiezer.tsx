import { motion } from "motion/react";
import { SAGE, SHADOW, INTERVAL_PRESETS } from "../lib/constants";
import { intervalLabel } from "../lib/format";

export function IntervalKiezer({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const clamp = (n: number) => Math.min(365, Math.max(1, n));

  return (
    <div className="pt-3 px-1 space-y-4">
      <div className="flex items-center justify-between gap-4 bg-card rounded-2xl px-5 py-4 border border-border/50"
        style={{ boxShadow: SHADOW }}>
        <div className="text-left">
          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Interval</p>
          <p className="text-sm text-foreground font-semibold mt-0.5" style={{ fontFamily: "Lora,Georgia,serif", fontStyle: "italic" }}>
            {intervalLabel(value)}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <motion.button whileTap={{ scale: 0.88 }}
            onClick={() => onChange(clamp(value - 1))}
            disabled={value <= 1}
            aria-label="Minder dagen"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-light disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(73,110,70,0.5)]"
            style={{ background: "var(--secondary)", color: "var(--foreground)" }}>
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
            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-light disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(73,110,70,0.5)]"
            style={{ background: "var(--secondary)", color: "var(--foreground)" }}>
            +
          </motion.button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {INTERVAL_PRESETS.map((p) => {
          const active = value === p.days;
          return (
            <motion.button key={p.days}
              onClick={() => onChange(p.days)}
              whileTap={{ scale: 0.94 }}
              aria-pressed={active}
              initial={{ backgroundColor: "var(--secondary)", borderColor: "rgba(0,0,0,0)" }}
              animate={{
                backgroundColor: active ? "rgba(73,110,70,0.12)" : "var(--secondary)",
                borderColor: active ? "rgba(73,110,70,0.45)" : "rgba(0,0,0,0)",
              }}
              transition={{ duration: 0.14 }}
              className="py-2.5 rounded-2xl border-2 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(73,110,70,0.5)]">
              <span className="text-xs font-semibold block" style={{ color: active ? SAGE : "var(--foreground)" }}>
                {p.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
