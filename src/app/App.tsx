import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Toaster } from "sonner";
import { useAuth } from "./auth/AuthProvider";
import { useCuraStore } from "../stores/useCuraStore";
import { SHADOW_LG } from "./lib/constants";
import { pageIn, pageTx } from "./lib/motion";
import { BottomNav } from "./layout/BottomNav";
import { SheetContext, type SheetActions } from "./sheetContext";
import { AddTaskSheet } from "./sheets/AddTaskSheet";
import { NewRoomSheet } from "./sheets/NewRoomSheet";
import { EditRoomSheet } from "./sheets/EditRoomSheet";
import { NewRoutineSheet } from "./sheets/NewRoutineSheet";
import { EditRoutineSheet } from "./sheets/EditRoutineSheet";
import { HouseholdSheet } from "./sheets/HouseholdSheet";
import { ProfielSheet } from "./sheets/ProfielSheet";

// Route-level code splitting — each tab/screen becomes its own chunk instead
// of shipping in the single main bundle (CLAUDE.md §9 build verification).
const VandaagPage = lazy(() => import("./features/vandaag/VandaagPage").then((m) => ({ default: m.VandaagPage })));
const HuisPage = lazy(() => import("./features/huis/HuisPage").then((m) => ({ default: m.HuisPage })));
const RoutinesPage = lazy(() => import("./features/routines/RoutinesPage").then((m) => ({ default: m.RoutinesPage })));
const SamenPage = lazy(() => import("./features/samen/SamenPage").then((m) => ({ default: m.SamenPage })));
const DesignSystemPage = lazy(() => import("./features/design-system/DesignSystemPage").then((m) => ({ default: m.DesignSystemPage })));
const AuthPage = lazy(() => import("./features/auth/AuthPage").then((m) => ({ default: m.AuthPage })));
const CreateHouseholdPage = lazy(() => import("./features/auth/CreateHouseholdPage").then((m) => ({ default: m.CreateHouseholdPage })));
const AcceptInvitePage = lazy(() => import("./features/invite/AcceptInvitePage").then((m) => ({ default: m.AcceptInvitePage })));

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Navigate to="/vandaag" replace />} />
        <Route path="/vandaag" element={<PageTx><VandaagPage /></PageTx>} />
        <Route path="/huis" element={<PageTx><HuisPage /></PageTx>} />
        <Route path="/routines" element={<PageTx><RoutinesPage /></PageTx>} />
        <Route path="/samen" element={<PageTx><SamenPage /></PageTx>} />
        <Route path="/dev/design-system" element={<PageTx><DesignSystemPage /></PageTx>} />
      </Routes>
    </AnimatePresence>
  );
}

function PageTx({ children }: { children: ReactNode }) {
  return (
    <motion.div initial={pageIn} animate={{ opacity: 1, y: 0, transition: pageTx }} exit={{ opacity: 0, y: -6 }}>
      {children}
    </motion.div>
  );
}

/** The existing app shell — tabs, sheets, FAB. Assumes useCuraStore is already ready. */
function MainShell() {
  const [showAdd, setShowAdd] = useState(false);
  const [showNewRoom, setShowNewRoom] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [showNewRoutine, setShowNewRoutine] = useState(false);
  const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null);
  const [showHousehold, setShowHousehold] = useState(false);
  const [showProfiel, setShowProfiel] = useState(false);

  const sheetActions: SheetActions = useMemo(
    () => ({
      openAddTask: () => setShowAdd(true),
      openNewRoom: () => setShowNewRoom(true),
      openEditRoom: (roomId) => setEditingRoomId(roomId),
      openNewRoutine: () => setShowNewRoutine(true),
      openEditRoutine: (bundleId) => setEditingRoutineId(bundleId),
      openHousehold: () => setShowHousehold(true),
      openProfiel: () => setShowProfiel(true),
    }),
    [],
  );

  return (
    <SheetContext.Provider value={sheetActions}>
      <div className="relative w-full h-screen flex flex-col bg-background overflow-hidden">
        <div className="fixed inset-0 pointer-events-none z-0" style={{
          backgroundImage: "radial-gradient(ellipse 70% 50% at 15% 10%,color-mix(in srgb, var(--ambient-warm) 6%, transparent) 0%,transparent 60%),radial-gradient(ellipse 60% 40% at 85% 90%,color-mix(in srgb, var(--ambient-cool) 5%, transparent) 0%,transparent 60%)",
        }} />

        <div className="absolute bottom-0 left-0 right-0 pointer-events-none z-30" style={{
          height: "6rem",
          background: "linear-gradient(to top,color-mix(in srgb, var(--background) 96%, transparent) 0%,color-mix(in srgb, var(--background) 60%, transparent) 45%,transparent 100%)",
        }} />

        <div className="flex-1 overflow-y-auto scrollbar-hide pb-24 relative z-10">
          <Suspense fallback={null}>
            <AnimatedRoutes />
          </Suspense>
        </div>

        <BottomNav showAdd={showAdd} onAdd={() => setShowAdd((s) => !s)} />

        <AnimatePresence>
          {showAdd && <AddTaskSheet key="add" onClose={() => setShowAdd(false)} />}
          {showNewRoutine && <NewRoutineSheet key="nr" onClose={() => setShowNewRoutine(false)} />}
          {editingRoutineId && <EditRoutineSheet key="er" bundleId={editingRoutineId} onClose={() => setEditingRoutineId(null)} />}
          {showNewRoom && <NewRoomSheet key="room" onClose={() => setShowNewRoom(false)} />}
          {editingRoomId && <EditRoomSheet key="edit" roomId={editingRoomId} onClose={() => setEditingRoomId(null)} />}
          {showHousehold && <HouseholdSheet key="hs" onClose={() => setShowHousehold(false)} />}
          {showProfiel && (
            <ProfielSheet
              key="prof"
              onOpenHousehold={() => { setShowProfiel(false); setTimeout(() => setShowHousehold(true), 160); }}
              onClose={() => setShowProfiel(false)}
            />
          )}
        </AnimatePresence>
      </div>
    </SheetContext.Provider>
  );
}

/** Auth/household gating in front of MainShell — loading -> signed out -> no household -> the app. */
function Gate() {
  const { status } = useAuth();
  const init = useCuraStore((s) => s.init);
  const ready = useCuraStore((s) => s.ready);
  const households = useCuraStore((s) => s.households);

  useEffect(() => {
    if (status === "signedIn") init();
  }, [status, init]);

  if (status === "loading") return null;
  if (status === "signedOut") return <Suspense fallback={null}><AuthPage /></Suspense>;
  if (!ready) return null;
  if (households.length === 0) return <Suspense fallback={null}><CreateHouseholdPage /></Suspense>;
  return <MainShell />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-center" toastOptions={{
        style: {
          background: "var(--card)", color: "var(--foreground)",
          border: "1px solid var(--border)", borderRadius: "0.875rem",
          fontSize: "0.875rem", fontFamily: "'Plus Jakarta Sans',sans-serif",
          boxShadow: SHADOW_LG,
        },
      }} />
      <Routes>
        <Route path="/uitnodiging/:token" element={<Suspense fallback={null}><AcceptInvitePage /></Suspense>} />
        <Route path="/*" element={<Gate />} />
      </Routes>
    </BrowserRouter>
  );
}
