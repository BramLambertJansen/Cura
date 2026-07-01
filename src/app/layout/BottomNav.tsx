import type { CSSProperties } from "react";
import { Link, useLocation } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { CalendarDays, Home, RefreshCw, MoreHorizontal, Plus } from "lucide-react";
import { SAGE, TERRACOTTA, MUTED_FG, DESTRUCTIVE } from "../lib/constants";

const LEFT = [
  { to: "/vandaag", label: "Vandaag", icon: (a: boolean) => <CalendarDays size={20} strokeWidth={a ? 2.4 : 1.7} /> },
  { to: "/huis", label: "Huis", icon: (a: boolean) => <Home size={20} strokeWidth={a ? 2.4 : 1.7} /> },
];
const RIGHT = [
  { to: "/routines", label: "Routines", icon: (a: boolean) => <RefreshCw size={19} strokeWidth={a ? 2.4 : 1.7} /> },
  { to: "/meer", label: "Meer", icon: (a: boolean) => <MoreHorizontal size={20} strokeWidth={a ? 2.4 : 1.7} /> },
];

function NavTab({ tab }: { tab: typeof LEFT[number] }) {
  const location = useLocation();
  // Samen heeft geen eigen tab (CLAUDE.md §1) — bereikbaar via Meer, dus die tab blijft actief.
  const active =
    location.pathname.startsWith(tab.to) ||
    (tab.to === "/meer" && location.pathname.startsWith("/samen"));
  return (
    <Link
      to={tab.to}
      role="tab"
      aria-selected={active}
      aria-label={tab.label}
      aria-current={active ? "page" : undefined}
      className="relative flex-1 flex flex-col items-center justify-center gap-1 h-full pb-2 z-10 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0"
      style={{ "--tw-ring-color": "color-mix(in srgb, var(--primary) 50%, transparent)" } as CSSProperties}
    >
      {active && (
        <motion.div layoutId="nav-hill"
          className="absolute bottom-1 left-0 right-0 mx-auto w-14 h-3.5 pointer-events-none"
          transition={{ type: "spring", stiffness: 420, damping: 36 }}
          aria-hidden="true"
        >
          <div className="absolute inset-x-2 bottom-0 h-2 rounded-full blur-[6px] opacity-50"
            style={{ background: "color-mix(in srgb, var(--primary) 60%, transparent)" }} />
          <motion.svg
            viewBox="0 0 56 14" width="100%" height="100%" className="relative block"
            animate={{ y: [0, -1, 0] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          >
            <path
              d="M0 14 C1 7 9 1 19 0.5 C27 0.1 26 8 34 8.5 C41 9 45 5 48 3 C51 1 54 3 56 14 Z"
              fill="url(#nav-hill-gradient)"
            />
          </motion.svg>
        </motion.div>
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
    </Link>
  );
}

export function BottomNav({ showAdd, onAdd }: { showAdd: boolean; onAdd: () => void }) {
  return (
    <nav
      aria-label="Hoofdnavigatie"
      className="fixed bottom-0 left-0 right-0 z-40 flex justify-center"
      style={{
        paddingBottom: "calc(var(--safe-bottom) + 0.625rem)",
        paddingLeft: "calc(var(--safe-left) + 0.625rem)",
        paddingRight: "calc(var(--safe-right) + 0.625rem)",
      }}>
      <div
        className="cura-floating-nav w-full max-w-[26rem] rounded-[1.75rem] border"
        style={{
          background: "color-mix(in srgb, var(--card) 92%, transparent)",
          backdropFilter: "blur(24px) saturate(200%)",
          borderColor: "color-mix(in srgb, var(--border-color) 13%, transparent)",
          boxShadow: "var(--shadow-card-lg)",
        }}>
        <svg width="0" height="0" aria-hidden="true" focusable="false">
          <defs>
            <linearGradient id="nav-hill-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="color-mix(in srgb, var(--primary) 78%, white)" />
              <stop offset="100%" stopColor="var(--primary)" />
            </linearGradient>
          </defs>
        </svg>
        <div className="flex items-center h-[4.25rem] px-1" role="tablist">
          {LEFT.map((t) => <NavTab key={t.to} tab={t} />)}
          <div className="relative flex items-center justify-center w-20 flex-shrink-0" style={{ marginTop: "-1.75rem" }}>
            <AnimatePresence>
              {!showAdd && (
                <motion.div
                  key="pulse"
                  className="absolute rounded-full pointer-events-none"
                  style={{ width: "3.625rem", height: "3.625rem", border: `2px solid ${TERRACOTTA}` }}
                  initial={{ scale: 1, opacity: 0 }}
                  animate={{ scale: 1.55, opacity: 0 }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut", delay: 0.8 }}
                />
              )}
            </AnimatePresence>
            <motion.button onClick={onAdd}
              animate={{ rotate: showAdd ? 45 : 0, backgroundColor: showAdd ? DESTRUCTIVE : TERRACOTTA }}
              whileTap={{ scale: 0.87 }} whileHover={{ scale: 1.06 }}
              transition={{ type: "spring", stiffness: 420, damping: 26 }}
              className="relative rounded-full flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color-mix(in_srgb,var(--terracotta)_60%,transparent)]"
              style={{ width: "3.625rem", height: "3.625rem", boxShadow: "var(--shadow-fab)" }}
              aria-label={showAdd ? "Sluiten" : "Toevoegen"}
              aria-expanded={showAdd}>
              <Plus size={24} className="text-white" strokeWidth={2.2} aria-hidden="true" />
            </motion.button>
          </div>
          {RIGHT.map((t) => <NavTab key={t.to} tab={t} />)}
        </div>
      </div>
    </nav>
  );
}
