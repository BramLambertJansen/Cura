import type { CSSProperties } from "react";
import { NavLink, useLocation } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { CalendarDays, Home, RefreshCw, Heart, Plus } from "lucide-react";
import { SAGE, MUTED_FG, DESTRUCTIVE } from "../lib/constants";

const LEFT = [
  { to: "/vandaag", label: "Vandaag", icon: (a: boolean) => <CalendarDays size={20} strokeWidth={a ? 2.4 : 1.7} /> },
  { to: "/huis", label: "Huis", icon: (a: boolean) => <Home size={20} strokeWidth={a ? 2.4 : 1.7} /> },
];
const RIGHT = [
  { to: "/routines", label: "Routines", icon: (a: boolean) => <RefreshCw size={19} strokeWidth={a ? 2.4 : 1.7} /> },
  { to: "/samen", label: "Samen", icon: (a: boolean) => <Heart size={19} strokeWidth={a ? 2.4 : 1.7} fill={a ? "currentColor" : "none"} /> },
];

function NavTab({ tab }: { tab: typeof LEFT[number] }) {
  const location = useLocation();
  const active = location.pathname.startsWith(tab.to);
  return (
    <NavLink
      to={tab.to}
      role="tab"
      aria-selected={active}
      aria-label={tab.label}
      aria-current={active ? "page" : undefined}
      className="relative flex-1 flex flex-col items-center justify-center gap-1 h-full z-10 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0"
      style={{ "--tw-ring-color": "color-mix(in srgb, var(--primary) 50%, transparent)" } as CSSProperties}
    >
      {active && (
        <motion.div layoutId="nav-pill"
          className="absolute inset-x-1.5 top-2 bottom-2 rounded-xl"
          style={{ background: "color-mix(in srgb, var(--primary) 9%, transparent)" }}
          transition={{ type: "spring", stiffness: 420, damping: 36 }}
        />
      )}
      <motion.div
        animate={{ color: active ? SAGE : MUTED_FG, y: active ? -1 : 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="relative z-10"
      >
        {tab.icon(active)}
      </motion.div>
      <motion.span
        animate={{ color: active ? SAGE : MUTED_FG, fontWeight: active ? 600 : 500 }}
        className="text-[10px] leading-none relative z-10"
      >
        {tab.label}
      </motion.span>
    </NavLink>
  );
}

export function BottomNav({ showAdd, onAdd }: { showAdd: boolean; onAdd: () => void }) {
  return (
    <nav
      aria-label="Hoofdnavigatie"
      className="fixed bottom-0 left-0 right-0 z-40"
      style={{
        background: "color-mix(in srgb, var(--card) 94%, transparent)",
        backdropFilter: "blur(24px) saturate(200%)",
        borderTop: "1px solid color-mix(in srgb, var(--border-color) 9%, transparent)",
        paddingBottom: "var(--safe-bottom)",
        paddingLeft: "var(--safe-left)",
        paddingRight: "var(--safe-right)",
      }}>
      <div className="flex items-center h-[4.25rem]" role="tablist">
        {LEFT.map((t) => <NavTab key={t.to} tab={t} />)}
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
            className="relative rounded-full flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color-mix(in_srgb,var(--primary)_60%,transparent)]"
            style={{ width: "3.625rem", height: "3.625rem", boxShadow: "var(--shadow-fab)" }}
            aria-label="Toevoegen">
            <Plus size={24} className="text-white" strokeWidth={2.2} />
          </motion.button>
        </div>
        {RIGHT.map((t) => <NavTab key={t.to} tab={t} />)}
      </div>
    </nav>
  );
}
