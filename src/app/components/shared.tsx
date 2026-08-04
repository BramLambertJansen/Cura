import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { useEffect, useId, useRef, useState } from "react";
import { motion, AnimatePresence, useDragControls, useReducedMotion, useTransform, type MotionValue, type PanInfo } from "motion/react";
import { Check, ChevronDown, X, Trash2, Plus, Eye, EyeOff } from "lucide-react";
import { PRESS_TINT, PRIMARY_FG, SAGE, SHADOW } from "../lib/constants";
import { useKeyboardInset } from "../lib/useKeyboardInset";

// How far (as a fraction of the sheet's own height) or how fast (px/s) a
// downward drag from the handle has to go before it counts as "let go of
// this" rather than "just repositioning" — below both, it springs back.
const DRAG_CLOSE_DISTANCE_FRACTION = 0.25;
const DRAG_CLOSE_VELOCITY = 700;
const SHEET_SPRING = { type: "spring" as const, stiffness: 440, damping: 42 };

export function Sheet({
  onClose, children, tall = false, labelId = "sheet-title",
}: { onClose: () => void; children: ReactNode; tall?: boolean; labelId?: string }) {
  // On browsers that don't resize the layout viewport for the on-screen
  // keyboard (notably older iOS Safari), nudge the sheet up by the keyboard
  // height so its bottom action row stays above the keyboard instead of
  // being covered by it (CLAUDE.md mobile safe-area handling).
  const keyboardInset = useKeyboardInset();
  const reduceMotion = useReducedMotion();
  const dragControls = useDragControls();
  const sheetRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [dragY, setDragY] = useState(0);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // Focus trap + focus return: a modal dialog must keep Tab inside it, and give
  // focus back to whatever opened it once it unmounts — otherwise a keyboard
  // user can Tab straight through into BottomNav (mounted earlier in the DOM,
  // behind the backdrop) or lose their place entirely on close.
  useEffect(() => {
    const node = sheetRef.current;
    if (!node) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    function getFocusable(): HTMLElement[] {
      return Array.from(
        node!.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null);
    }

    // Most sheets autoFocus a field already; only steal focus if nothing inside got it.
    if (!node.contains(document.activeElement)) {
      (getFocusable()[0] ?? node).focus();
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const focusable = getFocusable();
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    node.addEventListener("keydown", onKeyDown);
    return () => {
      node.removeEventListener("keydown", onKeyDown);
      // Only restore focus if it's still where this sheet left it. A sheet-swap
      // (close this one, open another in the same tick — e.g. Profiel ⇄
      // Huishouden) mounts the new sheet's own focus trap well before
      // AnimatePresence finishes this one's exit animation and actually
      // unmounts it, so by the time this cleanup runs the new sheet may already
      // hold focus — blindly restoring here would yank it back behind the new
      // dialog instead of leaving it there.
      if (previouslyFocused && document.contains(previouslyFocused) && node.contains(document.activeElement)) {
        previouslyFocused.focus();
      }
    };
  }, []);

  function handleDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    setDragging(false);
    setDragY(0);
    const sheetHeight = sheetRef.current?.offsetHeight ?? 0;
    const distanceThreshold = sheetHeight * DRAG_CLOSE_DISTANCE_FRACTION;
    if (info.offset.y > distanceThreshold || info.velocity.y > DRAG_CLOSE_VELOCITY) onClose();
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: dragging ? Math.max(0, 1 - dragY / 300) : 1 }} exit={{ opacity: 0 }}
        transition={dragging ? { duration: 0 } : { duration: 0.22 }}
        className="absolute inset-0 z-40"
        style={{ background: "color-mix(in srgb, var(--overlay-color) 32%, transparent)", backdropFilter: "blur(6px)" }}
        onClick={onClose}
        aria-hidden="true"
      />
      <motion.div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelId}
        tabIndex={-1}
        drag={reduceMotion ? false : "y"}
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.55 }}
        dragTransition={{ bounceStiffness: SHEET_SPRING.stiffness, bounceDamping: SHEET_SPRING.damping }}
        onDragStart={() => setDragging(true)}
        onDrag={(_, info) => setDragY(Math.max(0, info.offset.y))}
        onDragEnd={handleDragEnd}
        initial={{ y: "100%" }} animate={{ y: -keyboardInset }} exit={{ y: "100%" }}
        transition={dragging ? { duration: 0 } : SHEET_SPRING}
        className="absolute bottom-0 left-0 right-0 z-50 rounded-t-[2rem] pt-5 overflow-y-auto scrollbar-hide"
        style={{
          background: "var(--card)",
          boxShadow: `0 -16px 56px color-mix(in srgb, var(--shadow-color) 14%, transparent),0 -2px 10px color-mix(in srgb, var(--shadow-color) 6%, transparent)`,
          // Always capped + scrollable, not just for `tall` sheets: when the
          // keyboard opens (often instantly, since most sheets autoFocus
          // their first field) it eats into the available height without
          // shrinking this absolutely-positioned sheet's own box, and the
          // shell behind it is overflow-hidden. Without an internal scroll
          // region here, content below the fold (e.g. the submit button)
          // would be unreachable rather than just offscreen.
          maxHeight: tall ? "calc(90dvh - var(--safe-top))" : "calc(100dvh - var(--safe-top) - 1rem)",
          paddingBottom: tall ? "calc(2rem + var(--safe-bottom))" : "calc(2.5rem + var(--safe-bottom))",
          paddingLeft: "calc(1.25rem + var(--safe-left))",
          paddingRight: "calc(1.25rem + var(--safe-right))",
        }}
        onClick={(e) => e.stopPropagation()}>
        <div
          className="flex justify-center items-center -mt-5 py-5 mb-1 cursor-grab active:cursor-grabbing"
          style={{ touchAction: "none" }}
          onPointerDown={(e: ReactPointerEvent) => !reduceMotion && dragControls.start(e)}
          aria-hidden="true">
          <motion.div
            animate={{ scaleX: dragging ? 1.15 : 1, opacity: dragging ? 0.9 : 0.6 }}
            transition={{ duration: 0.12 }}
            className="w-14 h-[5px] rounded-full" style={{ background: "var(--muted)" }} />
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
      <h3 id={id} className="text-xl font-medium text-foreground font-display">{title}</h3>
      <IconButton onClick={onClose} label="Sluiten" icon={<X size={15} className="text-muted-foreground" aria-hidden="true" />} />
    </div>
  );
}

export function Checkbox({
  checked, onToggle, size = "lg", label,
}: { checked: boolean; onToggle: () => void; size?: "md" | "lg"; label?: string }) {
  const dim = size === "lg" ? "w-7 h-7" : "w-6 h-6";
  // A soft sage ring ripples out on each unchecked→checked transition — a small
  // celebration, never on mount (a page of already-done tasks shouldn't ripple).
  const prevChecked = useRef(checked);
  const [rippleKey, setRippleKey] = useState(0);
  useEffect(() => {
    if (checked && !prevChecked.current) setRippleKey((n) => n + 1);
    prevChecked.current = checked;
  }, [checked]);
  return (
    <motion.button
      onClick={onToggle}
      role="checkbox"
      aria-checked={checked}
      aria-label={label ?? (checked ? "Taak afgevinkt" : "Taak afvinken")}
      whileTap={{ scale: 0.7 }}
      transition={{ type: "spring", stiffness: 500, damping: 25 }}
      className={`${dim} relative flex-shrink-0 rounded-full focus-ring focus-visible:ring-offset-1`}>
      {/* Invisible hit-area extension: the visible circle is 24–28px, well under the ~44px touch guideline. */}
      <span className="absolute -inset-2 rounded-full" aria-hidden="true" />
      {rippleKey > 0 && (
        <motion.span
          key={rippleKey}
          aria-hidden="true"
          initial={{ scale: 0.9, opacity: 0.5 }}
          animate={{ scale: 2.1, opacity: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="absolute inset-0 rounded-full border-2 pointer-events-none"
          style={{ borderColor: SAGE }}
        />
      )}
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

const SWIPE_REVEAL_RANGE: Record<"left" | "right", [number, number]> = { right: [10, 48], left: [-48, -10] };
const SWIPE_REVEAL_SCALE_RANGE: Record<"left" | "right", [number, number]> = { right: [10, 60], left: [-60, -10] };

/**
 * Shared swipe-reveal chrome behind a swipeable row: an optional tinted wash
 * plus a fading, scaling icon-in-circle badge, driven by the drag `x`
 * MotionValue from useSwipeRow. Consolidates what TaakRij, TijdlijnTaakRij and
 * BoodschapRij's check-side reveal each hand-rolled separately with slightly
 * different paddings/radii/tint percentages (CLAUDE.md Swipe & verversen).
 *
 * `fadeBackground` exists because TijdlijnTaakRij's rows have no opaque
 * background of their own — its wash has to fade in with the drag (an
 * `opacity`-bound `motion.div` wrapping a static-tint inner layer) or it would
 * show through at rest; TaakRij/BoodschapRij's rows sit on their own opaque
 * card, so their wash can stay a plain, always-rendered background that the
 * card simply hides until the row slides off it.
 *
 * BoodschapRij's delete-side reveal (an inline label + icon, not a circle) is
 * deliberately NOT modeled here — forcing that different shape through this
 * badge-shaped primitive would cost more than the ~10 duplicated lines it'd save.
 */
export function SwipeReveal({
  x, side, tone, icon, padding = "", rounded,
  fadeBackground = false,
  range = SWIPE_REVEAL_RANGE[side],
  scaleRange = SWIPE_REVEAL_SCALE_RANGE[side],
}: {
  x: MotionValue<number>;
  side: "left" | "right";
  tone: "primary" | "destructive";
  icon: ReactNode;
  /** Tailwind padding utility pushing the badge in from the row's edge, e.g. "pl-5" / "pr-4". */
  padding?: string;
  /** Tailwind rounding utility for the background wash, matching the row's own corners. Omit to skip the wash entirely (BoodschapRij's check side has none). */
  rounded?: string;
  fadeBackground?: boolean;
  /** useTransform domain for the badge's opacity+scale. Defaults to the shared check/plan/dismiss reveal's curve — every current row uses it. */
  range?: [number, number];
  scaleRange?: [number, number];
}) {
  const opacity = useTransform(x, range, side === "right" ? [0, 1] : [1, 0]);
  const scale = useTransform(x, scaleRange, side === "right" ? [0.6, 1] : [1, 0.6]);
  const tint = `color-mix(in srgb, var(--${tone}) 10%, transparent)`;
  const accent = tone === "primary" ? SAGE : "var(--destructive)";
  const hasWash = Boolean(rounded);
  const wrapperClassName = `absolute inset-0 flex items-center ${side === "left" ? "justify-end " : ""}${padding} pointer-events-none`;

  const badge = (
    <motion.div
      style={fadeBackground ? { scale } : { opacity, scale }}
      className={`${hasWash && fadeBackground ? "relative " : ""}w-7 h-7 rounded-full flex items-center justify-center`}>
      <span className="w-full h-full rounded-full flex items-center justify-center" style={{ background: accent }}>
        {icon}
      </span>
    </motion.div>
  );

  if (fadeBackground) {
    return (
      <motion.div aria-hidden="true" style={{ opacity }} className={wrapperClassName}>
        {hasWash && <div className={`absolute inset-0 ${rounded}`} style={{ background: tint }} />}
        {badge}
      </motion.div>
    );
  }
  return (
    <div aria-hidden="true" className={`${wrapperClassName} ${rounded ?? ""}`.trim()} style={hasWash ? { background: tint } : undefined}>
      {badge}
    </div>
  );
}

/**
 * Selectable pill for pick-one/pick-optional rows (trigger, eigenaar, soort
 * ruimte) — the single source for the "sage when selected" chip that used to
 * be copy-pasted per sheet. Announces state via aria-pressed and keeps the
 * standard focus ring.
 */
export function KeuzeChip({
  selected, onClick, children,
}: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <motion.button
      whileTap={{ scale: 0.93 }}
      onClick={onClick}
      aria-pressed={selected}
      animate={{
        backgroundColor: selected ? SAGE : "var(--input-background)",
        color: selected ? PRIMARY_FG : "var(--muted-foreground)",
        boxShadow: selected ? "none" : "var(--shadow-input)",
      }}
      transition={{ duration: 0.14 }}
      className="px-4 py-2 rounded-full text-sm font-medium focus-ring">
      {children}
    </motion.button>
  );
}

/**
 * Larger selectable card-tile — the `border-2` + animated tint chip that the
 * room-picker grid and the interval presets each re-implemented inline (the
 * "geen eigen chip-varianten per sheet" concern, CLAUDE.md §7). `tint` colours
 * the selected fill/border (a room's own colour, or sage by default); the mix
 * percentages default to the interval look and can be nudged per use. Compose
 * the tile's content (label, check badge) as children; pass padding/alignment
 * via `className`.
 */
export function OptieKaart({
  selected, onClick, tint = "var(--primary)", selectedBg = 12, selectedBorder = 45, ariaLabel, className = "", children,
}: {
  selected: boolean; onClick: () => void; tint?: string; selectedBg?: number; selectedBorder?: number;
  ariaLabel?: string; className?: string; children: ReactNode;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.94 }}
      aria-pressed={selected}
      aria-label={ariaLabel}
      initial={{ backgroundColor: "var(--input-background)", borderColor: "var(--border-input)" }}
      animate={{
        backgroundColor: selected ? `color-mix(in srgb, ${tint} ${selectedBg}%, transparent)` : "var(--input-background)",
        borderColor: selected ? `color-mix(in srgb, ${tint} ${selectedBorder}%, transparent)` : "var(--border-input)",
      }}
      transition={{ duration: 0.15 }}
      style={{ boxShadow: "var(--shadow-input)" }}
      className={`rounded-2xl border-2 focus-ring ${className}`}>
      {children}
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

/** Just the hairline border, no fill — pair it with a `bg-card*` utility so the
 * fill is class-driven (one source), never a competing inline background. */
export const CARD_BORDER = "border border-border/60";
/** Canonical bg-card/hairline-border chrome, minus radius (callers with a non-default corner — RoutineKaart's rounded-3xl — append their own). Reference this instead of duplicating the border/background literal inline. */
export const CARD_CHROME = `bg-card ${CARD_BORDER}`;

/**
 * Standard card chrome — hairline border, soft shadow, and a class-driven fill
 * (the bg-card / bg-card-active utility, so nothing competes with the colour).
 * Compose content inside instead of redefining this style inline; pass onClick
 * to render a tappable row. `tone="active"` swaps the fill for the warmer
 * --card-active (the warm-white used by the primary day-view cards, theme.css).
 */
export function Card({
  children, onClick, className = "px-4 py-3.5", ariaLabel, tone = "default",
}: { children: ReactNode; onClick?: () => void; className?: string; ariaLabel?: string; tone?: "default" | "active" }) {
  const chrome = `${tone === "active" ? "bg-card-active" : "bg-card"} ${CARD_BORDER} rounded-2xl`;
  if (onClick) {
    return (
      // A `ring-*` utility renders via `box-shadow`, which the inline `boxShadow`
      // below (the card's resting shadow) would silently clobber — `outline-*`
      // is a separate CSS property, so it layers on top instead of losing the fight.
      <motion.button whileTap={{ backgroundColor: PRESS_TINT }} onClick={onClick} aria-label={ariaLabel}
        className={`w-full text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color-mix(in_srgb,var(--primary)_50%,transparent)] ${chrome} ${className}`}
        style={{ boxShadow: SHADOW }}>
        {children}
      </motion.button>
    );
  }
  return <div className={`${chrome} ${className}`} style={{ boxShadow: SHADOW }}>{children}</div>;
}

/**
 * Gentle empty state with scene-specific, transparent Cura artwork. If the
 * asset cannot load, the explanatory text remains as the quiet fallback.
 */
export function Leeg({ image, text }: { image: string; text: string }) {
  const [imageFailed, setImageFailed] = useState(false);
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32, ease: [0.25, 0.46, 0.45, 0.94] }}>
      <Card className={`flex flex-col items-center gap-4 px-8 text-center ${imageFailed ? "py-14" : "py-8"}`}>
        {!imageFailed && (
          <img
            src={image} alt="" aria-hidden="true" loading="lazy"
            onError={() => setImageFailed(true)}
            className="w-40 h-40 object-contain"
          />
        )}
        <p className="text-[0.875rem] text-muted-foreground leading-relaxed max-w-[200px] font-display italic"
          style={{ lineHeight: 1.65 }}>{text}</p>
      </Card>
    </motion.div>
  );
}

/** Section heading — Lora italic, warm muted, sentence case */
export function Kop({ children, id }: { children: ReactNode; id?: string }) {
  return <h2 id={id} className="text-sm text-muted-foreground mb-2 ml-1 font-display italic" style={{ letterSpacing: "0.01em" }}>{children}</h2>;
}

/** Shared visual state for every "field" surface (VeldInput, VeldTextarea, FieldShell) — active means real DOM focus, never just "has a value". */
interface FieldState {
  active?: boolean;
  hasValue?: boolean;
  invalid?: boolean;
  disabled?: boolean;
}

export function fieldBorderColor({ invalid, active, hasValue }: FieldState): string {
  if (invalid) return "var(--border-input-invalid)";
  if (active) return "var(--border-input-focus)";
  if (hasValue) return "var(--border-input-filled)";
  return "var(--border-input)";
}

/** Resting shadow is an inset highlight, focus/invalid are outer glows — stack them so the card-like sheen stays visible even while focused. */
export function fieldBoxShadow({ invalid, active }: FieldState): string {
  if (invalid) return "var(--shadow-input), var(--shadow-input-invalid)";
  if (active) return "var(--shadow-input), var(--shadow-input-focus)";
  return "var(--shadow-input)";
}

function fieldBackground({ disabled }: FieldState): string {
  return disabled ? "var(--input-background-disabled)" : "var(--input-background)";
}

export function VeldInput({
  value, onChange, placeholder, autoFocus, onEnter, ariaLabel, type = "text", disabled, invalid, name, autoComplete, inputMode, spellCheck,
}: {
  value: string; onChange: (v: string) => void; placeholder: string; autoFocus?: boolean; onEnter?: () => void;
  ariaLabel?: string; type?: "text" | "email" | "password"; disabled?: boolean; invalid?: boolean; name?: string; autoComplete?: string; inputMode?: "text" | "email" | "numeric" | "tel" | "url" | "search"; spellCheck?: boolean;
}) {
  const [active, setActive] = useState(false);
  const [reveal, setReveal] = useState(false);
  const state: FieldState = { active, hasValue: value.length > 0, invalid, disabled };
  const isPassword = type === "password";
  return (
    <div className="relative">
      <input
        autoFocus={autoFocus}
        type={isPassword && reveal ? "text" : type}
        name={name}
        autoComplete={autoComplete}
        inputMode={inputMode}
        spellCheck={spellCheck}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
        onFocus={() => setActive(true)}
        onBlur={() => setActive(false)}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        className={`w-full rounded-2xl px-4 py-[1rem] ${isPassword ? "pr-11" : ""} text-foreground placeholder:text-muted-foreground outline-none text-[0.9375rem] border transition-[box-shadow,border-color,background-color,opacity] disabled:cursor-not-allowed disabled:opacity-60`}
        style={{
          background: fieldBackground(state),
          borderColor: fieldBorderColor(state),
          boxShadow: fieldBoxShadow(state),
          transition: "box-shadow 0.18s ease, border-color 0.18s ease",
        }} />
      {isPassword && (
        <button
          type="button"
          onClick={() => setReveal((v) => !v)}
          disabled={disabled}
          aria-label={reveal ? "Wachtwoord verbergen" : "Wachtwoord tonen"}
          aria-pressed={reveal}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center text-muted-foreground/70 hover:text-muted-foreground disabled:cursor-not-allowed focus-ring rounded-full p-1"
        >
          {reveal ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
        </button>
      )}
    </div>
  );
}

export function VeldTextarea({
  value, onChange, placeholder, ariaLabel, rows = 3, disabled, invalid,
}: { value: string; onChange: (v: string) => void; placeholder: string; ariaLabel?: string; rows?: number; disabled?: boolean; invalid?: boolean }) {
  const [active, setActive] = useState(false);
  const state: FieldState = { active, hasValue: value.length > 0, invalid, disabled };
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setActive(true)}
      onBlur={() => setActive(false)}
      placeholder={placeholder}
      aria-label={ariaLabel ?? placeholder}
      aria-invalid={invalid || undefined}
      disabled={disabled}
      rows={rows}
      className="w-full rounded-2xl px-4 py-[1rem] text-foreground placeholder:text-muted-foreground outline-none text-[0.9375rem] resize-none border transition-[box-shadow,border-color,background-color,opacity] disabled:cursor-not-allowed disabled:opacity-60"
      style={{
        background: fieldBackground(state),
        borderColor: fieldBorderColor(state),
        boxShadow: fieldBoxShadow(state),
        transition: "box-shadow 0.18s ease, border-color 0.18s ease",
      }} />
  );
}

/** Plain-div field chrome for non-<input> "field-like" rows (date-picker trigger, time/duur wrappers, Herhalen/Wekker rows) that need the same background/border/shadow state machine as VeldInput, without Framer Motion. */
export function FieldShell({
  children, active, hasValue, invalid, disabled, className = "",
}: { children: ReactNode; active?: boolean; hasValue?: boolean; invalid?: boolean; disabled?: boolean; className?: string }) {
  const state: FieldState = { active, hasValue, invalid, disabled };
  return (
    <div
      className={`rounded-2xl border ${className}`}
      style={{
        background: fieldBackground(state),
        borderColor: fieldBorderColor(state),
        boxShadow: fieldBoxShadow(state),
        transition: "box-shadow 0.18s ease, border-color 0.18s ease",
      }}>
      {children}
    </div>
  );
}

export function DubbelKnop({
  onCancel, onConfirm, label, disabled = false,
}: { onCancel: () => void; onConfirm: () => void; label: string; disabled?: boolean }) {
  return (
    <div className="flex gap-3">
      <motion.button whileTap={{ scale: 0.96 }} onClick={onCancel} className="flex-1 py-3.5 rounded-2xl border border-border text-foreground text-sm font-medium transition-[background-color,transform] hover:bg-secondary/70 focus-ring">Annuleren</motion.button>
      <motion.button whileTap={{ scale: 0.96 }} onClick={onConfirm} disabled={disabled}
        className="flex-1 py-3.5 rounded-2xl text-white text-sm font-semibold disabled:opacity-35 transition-[opacity,transform] focus-ring focus-visible:ring-offset-2"
        style={{ background: "var(--gradient-primary)", boxShadow: disabled ? "none" : `0 4px 16px color-mix(in srgb, var(--primary) 28%, transparent)` }}>{label}</motion.button>
    </div>
  );
}

/**
 * Primary gradient call-to-action — the button every auth/onboarding screen
 * and the invite sheet used to re-author inline. The sage glow is the shared
 * --shadow-cta token and hides itself while disabled/busy. Pass `icon` for a
 * leading glyph; the busy *label* stays at the call site (each screen phrases
 * its own "Even geduld…").
 *
 * `fullWidth` (default) is the standard full-bleed CTA; pass `fullWidth={false}`
 * for a compact inline pill — e.g. ErrorBoundary/FullScreenError's "opnieuw
 * (proberen)" retry button, so both share one gradient-CTA implementation
 * instead of each hand-rolling the look (CLAUDE.md §7).
 */
export function PrimaryButton({
  children, onClick, disabled = false, busy = false, icon, type = "button", ariaLabel, fullWidth = true,
}: {
  children: ReactNode; onClick?: () => void; disabled?: boolean; busy?: boolean;
  icon?: ReactNode; type?: "button" | "submit"; ariaLabel?: string; fullWidth?: boolean;
}) {
  const isDisabled = disabled || busy;
  return (
    <motion.button
      type={type}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      disabled={isDisabled}
      aria-busy={busy || undefined}
      aria-label={ariaLabel}
      className={`${fullWidth ? "w-full py-4 rounded-2xl" : "px-5 py-2.5 rounded-full"} text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40 transition-[opacity,transform] focus-ring focus-visible:ring-offset-2`}
      style={{ background: "var(--gradient-primary)", boxShadow: isDisabled ? "none" : "var(--shadow-cta)" }}>
      {icon}{children}
    </motion.button>
  );
}

/**
 * Destructive/irreversible-feeling action button that flips to an inline
 * "Toch niet / Ja, ..." confirm row — the shared ask-then-inline-confirm
 * pattern used by every edit sheet's delete action, and by anything else that
 * wants the same in-context confirm instead of a dismissible toast (e.g.
 * "Uitloggen"). Owns its own confirm toggle so callers don't each carry the
 * state. Pass a distinct `ariaLabel` (e.g. "Keuken verwijderen") when the
 * visible label is generic, and `icon` to override the default trash icon for
 * actions that aren't actually a delete.
 */
export function VerwijderKnop({
  label, ariaLabel, confirmLabel = "Ja, verwijder", icon, onConfirm,
}: { label: string; ariaLabel?: string; confirmLabel?: string; icon?: ReactNode; onConfirm: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  // The "del" button unmounts the instant the confirm row appears, so without
  // this a keyboard/screen-reader user's focus silently falls back to
  // document.body — move it onto the (safer, cancel) option instead.
  useEffect(() => {
    if (confirm) cancelRef.current?.focus();
  }, [confirm]);
  return (
    <AnimatePresence>
      {!confirm
        ? <motion.button key="del" whileTap={{ scale: 0.96 }} onClick={() => setConfirm(true)}
            aria-label={ariaLabel ?? label}
            className="w-full py-3 rounded-2xl text-sm font-medium flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/50"
            style={{ color: "var(--destructive)" }}>
            {icon ?? <Trash2 size={14} aria-hidden="true" />} {label}
          </motion.button>
        : <motion.div key="conf" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
            <motion.button ref={cancelRef} whileTap={{ scale: 0.96 }} onClick={() => setConfirm(false)}
              className="flex-1 py-3 rounded-2xl border border-border text-foreground text-sm font-medium focus-ring">Toch niet</motion.button>
            <motion.button whileTap={{ scale: 0.96 }} onClick={onConfirm}
              className="flex-1 py-3 rounded-2xl text-white text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/50 focus-visible:ring-offset-2"
              style={{ background: "var(--destructive)" }}>{confirmLabel}</motion.button>
          </motion.div>
      }
    </AnimatePresence>
  );
}

/**
 * Text field + sage "+" button for building a routine's task list, shared by the
 * new/edit routine sheets. Owns its own focus state and refocuses the input
 * after each add so you can keep typing the next task. Uses the bespoke py-3
 * field (smaller than VeldInput) the routine sheets have always used.
 */
export function TaakToevoegRij({
  value, onChange, onAdd, placeholder, ariaLabel,
}: { value: string; onChange: (v: string) => void; onAdd: () => void; placeholder: string; ariaLabel?: string }) {
  const [active, setActive] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  function add() { onAdd(); ref.current?.focus(); }
  return (
    <div className="flex gap-2 mb-7">
      <input ref={ref} type="text" value={value} onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") add(); }}
        onFocus={() => setActive(true)} onBlur={() => setActive(false)}
        placeholder={placeholder} aria-label={ariaLabel ?? placeholder}
        className="flex-1 rounded-2xl px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none text-sm border transition-all"
        style={{
          background: "var(--input-background)",
          borderColor: fieldBorderColor({ active, hasValue: !!value }),
          boxShadow: fieldBoxShadow({ active }),
        }} />
      <motion.button whileTap={{ scale: 0.88 }} onClick={add} disabled={!value.trim()}
        aria-label="Taak toevoegen"
        className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 disabled:opacity-40 focus-ring focus-visible:ring-offset-2"
        style={{ background: SAGE }}>
        <Plus size={17} className="text-white" aria-hidden="true" />
      </motion.button>
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
      className="relative w-11 h-6 rounded-full flex-shrink-0 focus-ring focus-visible:ring-offset-1">
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
          <h1 className="text-[2rem] font-medium text-foreground leading-tight font-display">{title}</h1>
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
      ? { background: "var(--gradient-primary)", color: PRIMARY_FG, boxShadow: `0 4px 16px color-mix(in srgb, var(--primary) 30%, transparent)` }
      : tone === "softStrong"
      ? { background: "color-mix(in srgb, var(--primary) 18%, transparent)", color: SAGE }
      : { background: "color-mix(in srgb, var(--accent) 45%, transparent)", color: SAGE };
  return (
    <div
      aria-hidden="true"
      className={`flex items-center justify-center flex-shrink-0 ${serif ? "font-display font-medium" : "font-bold"}`}
      style={{
        width: size, height: size,
        borderRadius: shape === "circle" ? "9999px" : "1.1rem",
        fontSize: size * 0.4,
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

/**
 * Round icon-only button — the sheet-close X and the back chevrons/arrows that
 * every sheet and detail header used to hand-roll. Pass the (sized, coloured)
 * icon as `icon`; `tone` picks the fill ("secondary" for on-sheet chrome,
 * "card" for a floating button over the page background).
 */
export function IconButton({
  icon, onClick, label, size = 9, tone = "secondary", className = "",
}: {
  icon: ReactNode; onClick: () => void; label: string;
  size?: 8 | 9 | 10; tone?: "secondary" | "card" | "primary"; className?: string;
}) {
  const dim = size === 8 ? "w-8 h-8" : size === 10 ? "w-10 h-10" : "w-9 h-9";
  const toneCls =
    tone === "card" ? "bg-card shadow-sm" : tone === "primary" ? "text-white" : "bg-secondary";
  // The green + is a CTA: gradient fill + soft glow, both routed back to tokens.
  const style =
    tone === "primary"
      ? { background: "var(--gradient-primary)", boxShadow: `0 3px 12px color-mix(in srgb, var(--primary) 26%, transparent)` }
      : undefined;
  return (
    <motion.button whileTap={{ scale: 0.9 }} onClick={onClick} aria-label={label} style={style}
      className={`${dim} rounded-full flex items-center justify-center flex-shrink-0 ${toneCls} focus-ring ${className}`}>
      {icon}
    </motion.button>
  );
}

/** Soft, italic hint line in a tinted card — the "waarschijnlijk weer toe" / quote pattern. Never a hard claim. */
export function HintBanner({ children, tone = "sage" }: { children: ReactNode; tone?: "sage" | "muted" }) {
  return (
    <div className="rounded-2xl px-4 py-3.5" style={{ background: "color-mix(in srgb, var(--accent) 20%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 36%, transparent)" }}>
      <p className="text-sm leading-snug font-display italic" style={{ color: tone === "sage" ? SAGE : "var(--foreground)", opacity: tone === "muted" ? 0.7 : 1 }}>
        {children}
      </p>
    </div>
  );
}

/** Sage pill button — secondary actions like "Nieuw" or "Ik pak dit". */
export function PillButton({
  children, icon, onClick, ariaLabel, size = "md", className = "",
}: { children: ReactNode; icon?: ReactNode; onClick: () => void; ariaLabel?: string; size?: "sm" | "md"; className?: string }) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.9 }}
      aria-label={ariaLabel}
      className={`flex items-center gap-1.5 rounded-full font-semibold transition-[background-color,box-shadow,transform] hover:shadow-sm focus-ring ${size === "md" ? "px-3.5 py-2 text-sm" : "px-3 py-1.5 text-xs"} ${className}`}
      style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)", color: SAGE }}>
      {icon}{children}
    </motion.button>
  );
}

/**
 * Small sage status pill — "Klaar" on a finished routine, or the interval/wekker
 * label on a field row. The role the removed shadcn ui/badge used to fill. The
 * `enter` animation matches where it's used: "pop" celebrates a completion,
 * "slide" eases a label in beside a toggle.
 */
export function StatusBadge({
  children, enter = "pop",
}: { children: ReactNode; enter?: "pop" | "slide" }) {
  const anim = enter === "pop"
    ? { initial: { scale: 0 }, animate: { scale: 1 }, transition: { type: "spring" as const, stiffness: 500, damping: 26 } }
    : { initial: { opacity: 0, x: -4 }, animate: { opacity: 1, x: 0 } };
  return (
    <motion.span {...anim}
      // A pill must never break across lines — an inline span that wraps mid-
      // label renders as two half-pills (KamerKaart's "Verdient aandacht" in a
      // narrow column did exactly that).
      className="text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)", color: SAGE }}>
      {children}
    </motion.span>
  );
}

/**
 * Collapsible group-card for a secondary, out-of-the-way list behind a
 * heading + count badge + chevron (Vandaag's "Afgerond"/"Misschien
 * handig"/"Logboek" sections). The header's accessible name comes from its
 * own visible text (heading + count) — never a separate `aria-label` — so a
 * screen-reader/voice-control user hears exactly what a sighted user reads;
 * `aria-expanded` conveys open/closed state on top of that, the standard
 * disclosure-button pattern.
 */
export function CollapsibleSection({
  title, count, icon, open, onToggle, tone = "muted", children,
}: {
  title: string; count: number; icon?: ReactNode; open: boolean; onToggle: () => void;
  tone?: "muted" | "active"; children: ReactNode;
}) {
  const chrome = tone === "active" ? "bg-card-active border border-border/60" : "border border-border";
  const contentId = useId();
  return (
    <div
      className={`rounded-2xl overflow-hidden ${chrome}`}
      style={tone === "active" ? { boxShadow: "var(--shadow-card)" } : { background: "color-mix(in srgb, var(--card) 60%, transparent)" }}>
      {/* ARIA APG accordion pattern: the heading wraps the trigger button, not
          the reverse — a <button>'s content model only permits phrasing
          content, so nesting a heading inside it is invalid HTML5. `contents`
          keeps the <h3> out of the box model so this stays layout-neutral. */}
      <h3 className="contents">
        <motion.button
          whileTap={{ scale: 0.99 }}
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={contentId}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 focus-ring">
          <span className="inline-flex items-center gap-2">
            {icon}
            <span className="font-display font-semibold text-sm text-foreground">{title}</span>
            <StatusBadge enter="slide">{count}</StatusBadge>
          </span>
          <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ type: "spring", stiffness: 400, damping: 30 }} className="flex text-muted-foreground">
            <ChevronDown size={15} aria-hidden="true" />
          </motion.span>
        </motion.button>
      </h3>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            id={contentId}
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.24 }} className="overflow-hidden">
            <div className="px-3 pb-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
    ? <motion.button whileTap={{ backgroundColor: PRESS_TINT }} onClick={onClick} className="w-full text-left">{inner}</motion.button>
    : <div>{inner}</div>;
}
