import type { CSSProperties, ReactNode } from "react";
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
        style={{ background: "color-mix(in srgb, var(--overlay-color) 32%, transparent)", backdropFilter: "blur(6px)" }}
        onClick={onClose}
        aria-hidden="true"
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelId}
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 440, damping: 42 }}
        className={`absolute bottom-0 left-0 right-0 z-50 rounded-t-[2rem] pt-5 ${tall ? "max-h-[90vh] overflow-y-auto" : ""} scrollbar-hide`}
        style={{
          background: "var(--card)",
          boxShadow: `0 -16px 56px color-mix(in srgb, var(--shadow-color) 14%, transparent),0 -2px 10px color-mix(in srgb, var(--shadow-color) 6%, transparent)`,
          paddingBottom: tall ? "calc(2rem + var(--safe-bottom))" : "calc(2.5rem + var(--safe-bottom))",
          paddingLeft: "calc(1.25rem + var(--safe-left))",
          paddingRight: "calc(1.25rem + var(--safe-right))",
        }}
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
        className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--primary)_50%,transparent)]">
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
      className={`${dim} relative flex-shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--primary)_50%,transparent)] focus-visible:ring-offset-1`}>
      <motion.div
        initial={{ backgroundColor: "rgba(0,0,0,0)", borderColor: "color-mix(in srgb, var(--outline-color) 28%, transparent)" }}
        animate={{ backgroundColor: checked ? SAGE : "rgba(0,0,0,0)", borderColor: checked ? SAGE : "color-mix(in srgb, var(--outline-color) 28%, transparent)" }}
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
  const col = v >= 1 ? "var(--chart-4)" : v > 0.7 ? "var(--progress-near)" : SAGE;
  const c = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle cx={c} cy={c} r={r} fill="none" stroke="color-mix(in srgb, var(--outline-color) 14%, transparent)" strokeWidth={stroke} />
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

/** Standard card chrome — bg-card, hairline border, soft shadow. Compose content inside instead of redefining this style inline; pass onClick to render a tappable row. */
export function Card({
  children, onClick, className = "px-4 py-3.5", ariaLabel,
}: { children: ReactNode; onClick?: () => void; className?: string; ariaLabel?: string }) {
  const chrome = "bg-card rounded-2xl border border-border/60";
  if (onClick) {
    return (
      <motion.button whileTap={{ backgroundColor: "rgba(0,0,0,0.02)" }} onClick={onClick} aria-label={ariaLabel}
        className={`w-full text-left transition-colors ${chrome} ${className}`}
        style={{ boxShadow: SHADOW }}>
        {children}
      </motion.button>
    );
  }
  return <div className={`${chrome} ${className}`} style={{ boxShadow: SHADOW }}>{children}</div>;
}

export function Leeg({ icon, text }: { icon: string; text: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32, ease: [0.25, 0.46, 0.45, 0.94] }}>
      <Card className="flex flex-col items-center gap-4 py-14 px-8 text-center">
        <span className="text-4xl select-none">{icon}</span>
        <p className="text-[0.875rem] text-muted-foreground leading-relaxed max-w-[200px]"
          style={{ fontFamily: "Lora,Georgia,serif", fontStyle: "italic", lineHeight: 1.65 }}>{text}</p>
      </Card>
    </motion.div>
  );
}

/** Section heading — Lora italic, warm muted, sentence case */
export function Kop({ children }: { children: ReactNode }) {
  return <p className="text-[0.8125rem] text-muted-foreground mb-3.5 ml-1" style={{ fontFamily: "Lora,Georgia,serif", fontStyle: "italic", letterSpacing: "0.01em" }}>{children}</p>;
}

export function VeldInput({
  value, onChange, placeholder, autoFocus, onEnter, ariaLabel, type = "text",
}: { value: string; onChange: (v: string) => void; placeholder: string; autoFocus?: boolean; onEnter?: () => void; ariaLabel?: string; type?: "text" | "email" | "password" }) {
  return (
    <input
      autoFocus={autoFocus}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
      placeholder={placeholder}
      aria-label={ariaLabel ?? placeholder}
      className="w-full rounded-2xl px-4 py-[1rem] text-foreground placeholder:text-muted-foreground/70 outline-none text-[0.9375rem] transition-all focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--primary)_28%,transparent)]"
      style={{
        background: "var(--secondary)",
        boxShadow: value ? `0 0 0 2px color-mix(in srgb, var(--primary) 28%, transparent),0 2px 12px color-mix(in srgb, var(--primary) 6%, transparent)` : "none",
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
        style={{ background: "var(--gradient-primary)", boxShadow: disabled ? "none" : `0 4px 16px color-mix(in srgb, var(--primary) 28%, transparent)` }}>{label}</motion.button>
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
      className="relative w-11 h-6 rounded-full flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--primary)_50%,transparent)] focus-visible:ring-offset-1">
      <motion.div animate={{ x: checked ? 22 : 3 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm" aria-hidden="true" />
    </motion.button>
  );
}

/** Page title + subtitle + optional action, used at the top of every tab. */
export function PageHeader({
  title, subtitle, action,
}: { title: string; subtitle: string; action?: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mb-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[2rem] font-medium text-foreground leading-tight" style={{ fontFamily: "Lora,Georgia,serif" }}>{title}</h1>
          <p className="text-sm text-muted-foreground mt-1.5">{subtitle}</p>
        </div>
        {action && <div className="mb-0.5 flex-shrink-0">{action}</div>}
      </div>
    </motion.div>
  );
}

/** Initial-letter avatar for a member. Decorative — always pair with a visible name nearby. */
export function Avatar({
  name, size = 36, tone = "soft", shape = "circle", serif = false,
}: {
  name: string;
  size?: number;
  tone?: "solid" | "soft" | "softStrong";
  shape?: "circle" | "rounded";
  serif?: boolean;
}) {
  const toneStyle: CSSProperties =
    tone === "solid"
      ? { background: "var(--gradient-primary)", color: "#fff", boxShadow: `0 4px 16px color-mix(in srgb, var(--primary) 30%, transparent)` }
      : tone === "softStrong"
      ? { background: "color-mix(in srgb, var(--primary) 18%, transparent)", color: SAGE }
      : { background: "color-mix(in srgb, var(--accent) 45%, transparent)", color: SAGE };
  return (
    <div
      aria-hidden="true"
      className="flex items-center justify-center flex-shrink-0 font-bold"
      style={{
        width: size, height: size,
        borderRadius: shape === "circle" ? "9999px" : "1.1rem",
        fontSize: size * 0.4,
        fontFamily: serif ? "Lora,Georgia,serif" : undefined,
        fontWeight: serif ? 500 : 700,
        ...toneStyle,
      }}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

/** Icon in a tinted rounded box — the lead visual on menu rows and link cards. */
export function IconBadge({
  icon, tone = "soft", size = 36,
}: { icon: ReactNode; tone?: "soft" | "muted"; size?: number }) {
  return (
    <div
      aria-hidden="true"
      className="flex items-center justify-center flex-shrink-0 rounded-xl"
      style={{
        width: size, height: size,
        background: tone === "soft" ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "var(--secondary)",
        color: tone === "soft" ? SAGE : "var(--muted-foreground)",
      }}>
      {icon}
    </div>
  );
}

/** Soft, italic hint line in a tinted card — the "waarschijnlijk weer toe" / quote pattern. Never a hard claim. */
export function HintBanner({ children, tone = "sage" }: { children: ReactNode; tone?: "sage" | "muted" }) {
  return (
    <div className="rounded-2xl px-4 py-3.5" style={{ background: "color-mix(in srgb, var(--accent) 20%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 36%, transparent)" }}>
      <p className="text-sm leading-snug" style={{ color: tone === "sage" ? SAGE : "var(--foreground)", opacity: tone === "muted" ? 0.7 : 1, fontFamily: "Lora,Georgia,serif", fontStyle: "italic" }}>
        {children}
      </p>
    </div>
  );
}

/** Sage pill button — secondary actions like "Nieuw" or "Ik pak dit". */
export function PillButton({
  children, icon, onClick, ariaLabel, size = "md",
}: { children: ReactNode; icon?: ReactNode; onClick: () => void; ariaLabel?: string; size?: "sm" | "md" }) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.9 }}
      aria-label={ariaLabel}
      className={`flex items-center gap-1.5 rounded-full font-semibold ${size === "md" ? "px-3.5 py-2 text-sm" : "px-3 py-1.5 text-xs"}`}
      style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)", color: SAGE }}>
      {icon}{children}
    </motion.button>
  );
}

/** Rounded container that groups rows (InstRij, member rows) with a hairline divider between them. */
export function GroupCard({ children }: { children: ReactNode[] }) {
  const items = children.filter(Boolean);
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "var(--secondary)" }}>
      {items.map((child, i) => (
        <div key={i}>
          {child}
          {i < items.length - 1 && <div className="h-px mx-4" style={{ background: "var(--border)" }} />}
        </div>
      ))}
    </div>
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
