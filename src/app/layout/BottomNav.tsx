import type { CSSProperties, ReactNode } from "react";
import { Link, useLocation } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { CalendarDays, Home, RefreshCw, MoreHorizontal, Plus } from "lucide-react";
import { SAGE, MUTED_FG, DESTRUCTIVE } from "../lib/constants";

// motion-wrapped Link so the whole tab gets the tactile whileTap squeeze.
const MotionLink = motion.create(Link);

interface Tab {
  to: string;
  label: string;
  icon: (active: boolean) => ReactNode;
}

const LEFT: Tab[] = [
  { to: "/vandaag", label: "Vandaag", icon: (a) => <CalendarDays size={20} strokeWidth={a ? 2.4 : 1.7} /> },
  { to: "/huis", label: "Huis", icon: (a) => <Home size={20} strokeWidth={a ? 2.4 : 1.7} /> },
];
const RIGHT: Tab[] = [
  { to: "/routines", label: "Routines", icon: (a) => <RefreshCw size={19} strokeWidth={a ? 2.4 : 1.7} /> },
  { to: "/meer", label: "Meer", icon: (a) => <MoreHorizontal size={20} strokeWidth={a ? 2.4 : 1.7} /> },
];

/** Soft haptic tick on tab switch — same guarded pattern as the done-toast; a no-op where the Vibration API is missing (iOS Safari). */
function hapticTick() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(4);
}

function NavTab({ tab, active }: { tab: Tab; active: boolean }) {
  return (
    <MotionLink
      to={tab.to}
      aria-current={active ? "page" : undefined}
      onClick={() => { if (!active) hapticTick(); }}
      whileTap={{ scale: 0.92 }}
      className="relative flex-1 flex flex-col items-center justify-center gap-1 h-full z-10 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset"
      style={{ "--tw-ring-color": "color-mix(in srgb, var(--primary) 50%, transparent)" } as CSSProperties}
    >
      {active && (
        <motion.div
          // Shared layoutId makes the pill glide from the previous tab to this one instead of blinking in.
          layoutId="nav-active-pill"
          className="absolute inset-x-3 inset-y-2 rounded-full pointer-events-none"
          style={{ background: "color-mix(in srgb, var(--primary) 9%, transparent)" }}
          transition={{ type: "spring", stiffness: 420, damping: 36 }}
          aria-hidden="true"
        />
      )}
      <motion.div
        animate={{ color: active ? SAGE : MUTED_FG, y: active ? -1 : 0, scale: active ? 1.06 : 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="relative z-10"
        aria-hidden="true"
      >
        {tab.icon(active)}
      </motion.div>
      {/* Weight switches via class (one repaint), not via animation — tweening font-weight makes the label wobble. */}
      <motion.span
        animate={{ color: active ? SAGE : MUTED_FG }}
        className={`text-[10px] leading-none relative z-10 ${active ? "font-semibold" : "font-medium"}`}
      >
        {tab.label}
      </motion.span>
    </MotionLink>
  );
}

export function BottomNav({ showAdd, onAdd }: { showAdd: boolean; onAdd: () => void }) {
  const { pathname } = useLocation();
  // Samen heeft geen eigen tab (CLAUDE.md §1) — bereikbaar via Meer, dus die tab blijft actief.
  const isActive = (to: string) =>
    pathname.startsWith(to) || (to === "/meer" && pathname.startsWith("/samen"));

  return (
    <nav
      aria-label="Hoofdnavigatie"
      className="fixed left-0 right-0 z-40 rounded-full"
      style={{
        bottom: "calc(var(--safe-bottom) + 0.75rem)",
        marginLeft: "calc(var(--safe-left) + 1rem)",
        marginRight: "calc(var(--safe-right) + 1rem)",
        background: "color-mix(in srgb, var(--card) 94%, transparent)",
        backdropFilter: "blur(24px) saturate(200%)",
        border: "1px solid color-mix(in srgb, var(--border-color) 9%, transparent)",
        boxShadow: "var(--shadow-card-lg)",
      }}>
      <div className="flex items-center h-[4.25rem]">
        {LEFT.map((t) => <NavTab key={t.to} tab={t} active={isActive(t.to)} />)}
        <div className="relative flex items-center justify-center w-20 flex-shrink-0" style={{ marginTop: "-1.75rem" }}>
          <AnimatePresence>
            {!showAdd && (
              <motion.div
                key="pulse"
                className="absolute rounded-full pointer-events-none"
                style={{ width: "3.625rem", height: "3.625rem", border: `2px solid ${SAGE}` }}
                initial={{ scale: 1, opacity: 0 }}
                animate={{ scale: 1.55, opacity: 0 }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut", delay: 0.8 }}
              />
            )}
          </AnimatePresence>
          <motion.button onClick={onAdd}
            animate={{ rotate: showAdd ? 45 : 0, backgroundColor: showAdd ? DESTRUCTIVE : SAGE }}
            whileTap={{ scale: 0.87 }} whileHover={{ scale: 1.06 }}
            transition={{ type: "spring", stiffness: 420, damping: 26 }}
            className="relative rounded-full flex items-center justify-center overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color-mix(in_srgb,var(--primary)_60%,transparent)]"
            style={{ width: "3.625rem", height: "3.625rem", boxShadow: "var(--shadow-fab)" }}
            aria-label={showAdd ? "Sluiten" : "Toevoegen"}
            aria-expanded={showAdd}>
            {/* Gradient face matching the app's primary buttons; fades out so the animated backgroundColor (-> destructive) shows through when open. */}
            <motion.div
              aria-hidden="true"
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{ background: "var(--gradient-primary)" }}
              animate={{ opacity: showAdd ? 0 : 1 }}
              transition={{ duration: 0.2 }}
            />
            <Plus size={24} className="relative text-white" strokeWidth={2.2} aria-hidden="true" />
          </motion.button>
        </div>
        {RIGHT.map((t) => <NavTab key={t.to} tab={t} active={isActive(t.to)} />)}
      </div>
    </nav>
  );
}
