import type { ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, X } from "lucide-react";
import { SAGE, SHADOW } from "../lib/constants";

export function Sheet({
  onClose, children, tall = false, labelId = "sheet-title",
}: { onClose: () => void; children: ReactNode; tall?: boolean; labelId?: string }) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}
        className="absolute inset-0 z-40"
        style={{ background: "rgba(22,18,12,0.32)", backdropFilter: "blur(6px)" }}
        onClick={onClose}
        aria-hidden="true"
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelId}
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 440, damping: 42 }}
        className={`absolute bottom-0 left-0 right-0 z-50 rounded-t-[2rem] px-5 pt-5 ${tall ? "pb-8 max-h-[90vh] overflow-y-auto" : "pb-10"} scrollbar-hide`}
        style={{ background: "var(--card)", boxShadow: `0 -16px 56px rgba(80,65,45,0.14),0 -2px 10px rgba(80,65,45,0.06)` }}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-center mb-6" aria-hidden="true">
          <div className="w-14 h-[5px] rounded-full" style={{ background: "var(--muted)" }} />
        </div>
        {children}
      </motion.div>
    </>
  );
}

export function SheetHeader({
  title, onClose, id = "sheet-title",
}: { title: string; onClose: () => void; id?: string }) {
  return (
    <div className="flex items-center justify-between mb-7">
      <h3 id={id} className="text-xl font-medium text-foreground" style={{ fontFamily: "Lora,Georgia,serif" }}>{title}</h3>
      <motion.button
        whileTap={{ scale: 0.88 }} onClick={onClose}
        aria-label="Sluiten"
        className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(73,110,70,0.5)]">
        <X size={15} className="text-muted-foreground" aria-hidden="true" />
      </motion.button>
    </div>
  );
}

export function Checkbox({
  checked, onToggle, size = "lg", label,
}: { checked: boolean; onToggle: () => void; size?: "md" | "lg"; label?: string }) {
  const dim = size === "lg" ? "w-7 h-7" : "w-6 h-6";
  return (
    <motion.button
      onClick={onToggle}
      role="checkbox"
      aria-checked={checked}
      aria-label={label ?? (checked ? "Taak afgevinkt" : "Taak afvinken")}
      whileTap={{ scale: 0.7 }}
      transition={{ type: "spring", stiffness: 500, damping: 25 }}
      className={`${dim} relative flex-shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(73,110,70,0.5)] focus-visible:ring-offset-1`}>
      <motion.div
        initial={{ backgroundColor: "rgba(0,0,0,0)", borderColor: "rgba(107,98,90,0.28)" }}
        animate={{ backgroundColor: checked ? SAGE : "rgba(0,0,0,0)", borderColor: checked ? SAGE : "rgba(107,98,90,0.28)" }}
        transition={{ type: "spring", stiffness: 320, damping: 24 }}
        className="absolute inset-0 rounded-full border-2" aria-hidden="true" />
      <AnimatePresence>
        {checked && (
          <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} transition={{ type: "spring", stiffness: 600, damping: 22, delay: 0.04 }} className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
            <Check size={size === "lg" ? 12 : 10} strokeWidth={3.5} className="text-white" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

/** Ring progress indicator — fixed from the original export, which discarded its own geometry and rendered nothing. */
export function RingProgress({ value, size = 44, stroke = 3 }: { value: number; size?: number; stroke?: number }) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const v = Math.min(1, Math.max(0, value));
  const col = v >= 1 ? "#C4A45A" : v > 0.7 ? "#7DA87A" : SAGE;
  const c = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle cx={c} cy={c} r={r} fill="none" stroke="rgba(107,98,90,0.14)" strokeWidth={stroke} />
      <circle
        cx={c} cy={c} r={r} fill="none" stroke={col} strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - v)}
        transform={`rotate(-90 ${c} ${c})`}
        style={{ transition: "stroke-dashoffset 0.4s ease, stroke 0.4s ease" }}
      />
    </svg>
  );
}

export function Leeg({ icon, text }: { icon: string; text: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="flex flex-col items-center gap-4 py-14 px-8 text-center rounded-2xl bg-card border border-border/50"
      style={{ boxShadow: SHADOW }}>
      <span className="text-4xl select-none">{icon}</span>
      <p className="text-[0.875rem] text-muted-foreground leading-relaxed max-w-[200px]"
        style={{ fontFamily: "Lora,Georgia,serif", fontStyle: "italic", lineHeight: 1.65 }}>{text}</p>
    </motion.div>
  );
}

/** Section heading — Lora italic, warm muted, sentence case */
export function Kop({ children }: { children: ReactNode }) {
  return <p className="text-[0.8125rem] text-muted-foreground mb-3.5 ml-1" style={{ fontFamily: "Lora,Georgia,serif", fontStyle: "italic", letterSpacing: "0.01em" }}>{children}</p>;
}

export function VeldInput({
  value, onChange, placeholder, autoFocus, onEnter, ariaLabel,
}: { value: string; onChange: (v: string) => void; placeholder: string; autoFocus?: boolean; onEnter?: () => void; ariaLabel?: string }) {
  return (
    <input
      autoFocus={autoFocus}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
      placeholder={placeholder}
      aria-label={ariaLabel ?? placeholder}
      className="w-full rounded-2xl px-4 py-[1rem] text-foreground placeholder:text-muted-foreground/70 outline-none text-[0.9375rem] transition-all focus-visible:ring-2 focus-visible:ring-[rgba(73,110,70,0.28)]"
      style={{
        background: "var(--secondary)",
        boxShadow: value ? `0 0 0 2px rgba(73,110,70,0.28),0 2px 12px rgba(73,110,70,0.06)` : "none",
        transition: "box-shadow 0.18s ease",
      }} />
  );
}

export function DubbelKnop({
  onCancel, onConfirm, label, disabled = false,
}: { onCancel: () => void; onConfirm: () => void; label: string; disabled?: boolean }) {
  return (
    <div className="flex gap-3">
      <motion.button whileTap={{ scale: 0.96 }} onClick={onCancel} className="flex-1 py-3.5 rounded-2xl border border-border text-foreground text-sm font-medium">Annuleren</motion.button>
      <motion.button whileTap={{ scale: 0.96 }} onClick={onConfirm} disabled={disabled}
        className="flex-1 py-3.5 rounded-2xl text-white text-sm font-semibold disabled:opacity-35 transition-opacity"
        style={{ background: `linear-gradient(135deg,#5A8457 0%,${SAGE} 100%)`, boxShadow: disabled ? "none" : `0 4px 16px rgba(73,110,70,0.28)` }}>{label}</motion.button>
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <motion.button
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      whileTap={{ scale: 0.9 }}
      animate={{ backgroundColor: checked ? SAGE : "var(--muted)" }}
      transition={{ duration: 0.18 }}
      className="relative w-11 h-6 rounded-full flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(73,110,70,0.5)] focus-visible:ring-offset-1">
      <motion.div animate={{ x: checked ? 22 : 3 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm" aria-hidden="true" />
    </motion.button>
  );
}

export function InstRij({
  icon, label, right, onClick,
}: { icon: ReactNode; label: ReactNode; right: ReactNode; onClick?: () => void }) {
  const inner = (
    <div className="px-4 py-3.5 flex items-center gap-3">
      <div className="w-7 h-7 flex items-center justify-center flex-shrink-0 text-muted-foreground" aria-hidden="true">{icon}</div>
      <span className="flex-1 text-sm font-medium text-foreground">{label}</span>
      {right}
    </div>
  );
  return onClick
    ? <motion.button whileTap={{ backgroundColor: "rgba(0,0,0,0.03)" }} onClick={onClick} className="w-full text-left">{inner}</motion.button>
    : <div>{inner}</div>;
}
