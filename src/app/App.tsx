import { useEffect, useMemo, useState, type ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Toaster } from "sonner";
import { useCuraStore } from "../stores/useCuraStore";
import { SHADOW_LG } from "./lib/constants";
import { pageIn, pageTx } from "./lib/motion";
import { BottomNav } from "./layout/BottomNav";
import { SheetContext, type SheetActions } from "./sheetContext";
import { VandaagPage } from "./features/vandaag/VandaagPage";
import { HuisPage } from "./features/huis/HuisPage";
import { RoutinesPage } from "./features/routines/RoutinesPage";
import { SamenPage } from "./features/samen/SamenPage";
import { AddTaskSheet } from "./sheets/AddTaskSheet";
import { NewRoomSheet } from "./sheets/NewRoomSheet";
import { EditRoomSheet } from "./sheets/EditRoomSheet";
import { NewRoutineSheet } from "./sheets/NewRoutineSheet";
import { EditRoutineSheet } from "./sheets/EditRoutineSheet";
import { HouseholdSheet } from "./sheets/HouseholdSheet";
import { ProfielSheet } from "./sheets/ProfielSheet";

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

export default function App() {
  const init = useCuraStore((s) => s.init);
  const ready = useCuraStore((s) => s.ready);

  const [showAdd, setShowAdd] = useState(false);
  const [showNewRoom, setShowNewRoom] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [showNewRoutine, setShowNewRoutine] = useState(false);
  const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null);
  const [showHousehold, setShowHousehold] = useState(false);
  const [showProfiel, setShowProfiel] = useState(false);

  useEffect(() => {
    init();
  }, [init]);

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

  if (!ready) return null;

  return (
    <BrowserRouter>
      <SheetContext.Provider value={sheetActions}>
        <div className="relative w-full h-screen flex flex-col bg-background overflow-hidden">
          <div className="fixed inset-0 pointer-events-none z-0" style={{
            backgroundImage: "radial-gradient(ellipse 70% 50% at 15% 10%,rgba(255,235,170,0.06) 0%,transparent 60%),radial-gradient(ellipse 60% 40% at 85% 90%,rgba(170,210,155,0.05) 0%,transparent 60%)",
          }} />

          <Toaster position="top-center" toastOptions={{
            style: {
              background: "var(--card)", color: "var(--foreground)",
              border: "1px solid var(--border)", borderRadius: "0.875rem",
              fontSize: "0.875rem", fontFamily: "'Plus Jakarta Sans',sans-serif",
              boxShadow: SHADOW_LG,
            },
          }} />

          <div className="absolute bottom-0 left-0 right-0 pointer-events-none z-30" style={{
            height: "6rem",
            background: "linear-gradient(to top,rgba(233,226,213,0.96) 0%,rgba(233,226,213,0.6) 45%,transparent 100%)",
          }} />

          <div className="flex-1 overflow-y-auto scrollbar-hide pb-24 relative z-10">
            <AnimatedRoutes />
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
    </BrowserRouter>
  );
}
