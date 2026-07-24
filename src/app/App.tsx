import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTaskReminders } from "./lib/useTaskReminders";
import { useTaskDeepLink } from "./lib/useTaskDeepLink";
import { useFocusTimer } from "./lib/useFocusTimer";
import { usePushReconcile } from "./lib/usePushSubscription";
import { BrowserRouter, Navigate, Route, Routes, matchPath, useLocation } from "react-router";
import { motion, AnimatePresence, MotionConfig } from "motion/react";
import { Toaster } from "sonner";
import { useAuth } from "./auth/AuthProvider";
import { useCuraStore } from "../stores/useCuraStore";
import { useOnboardingSeen } from "./lib/useOnboardingSeen";
import { useDaypart } from "./lib/useDaypart";
import { SHADOW_LG, DAYPART_NAV } from "./lib/constants";
import { pageIn, pageTx } from "./lib/motion";
import { BottomNav } from "./layout/BottomNav";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AppBackground } from "./components/AppBackground";
import { FullScreenSkeleton, PageSkeleton } from "./components/Skeletons";
import { FullScreenError } from "./components/FullScreenError";
import { ConnectivityBanner } from "./components/ConnectivityBanner";
import { UpdatePrompt } from "./components/UpdatePrompt";
import { PullToRefreshIndicator } from "./components/PullToRefreshIndicator";
import { FocusMiniPill } from "./components/FocusMiniPill";
import { usePullToRefresh } from "./lib/usePullToRefresh";
import { SheetContext, type SheetActions } from "./sheetContext";

// Route-level code splitting — each tab/screen becomes its own chunk instead
// of shipping in the single main bundle (CLAUDE.md §9 build verification).
const VandaagPage = lazy(() => import("./features/vandaag/VandaagPage").then((m) => ({ default: m.VandaagPage })));
const HuisPage = lazy(() => import("./features/huis/HuisPage").then((m) => ({ default: m.HuisPage })));
const RoutinesPage = lazy(() => import("./features/routines/RoutinesPage").then((m) => ({ default: m.RoutinesPage })));
const RoutineSessionPage = lazy(() => import("./features/routines/RoutineSessionPage").then((m) => ({ default: m.RoutineSessionPage })));
const SamenPage = lazy(() => import("./features/samen/SamenPage").then((m) => ({ default: m.SamenPage })));
const MeerPage = lazy(() => import("./features/meer/MeerPage").then((m) => ({ default: m.MeerPage })));
const TakenPage = lazy(() => import("./features/taken/TakenPage").then((m) => ({ default: m.TakenPage })));
const BoodschappenPage = lazy(() => import("./features/boodschappen/BoodschappenPage").then((m) => ({ default: m.BoodschappenPage })));
const FocusPage = lazy(() => import("./features/focus/FocusPage").then((m) => ({ default: m.FocusPage })));
const DesignSystemPage = lazy(() => import("./features/design-system/DesignSystemPage").then((m) => ({ default: m.DesignSystemPage })));
const AuthPage = lazy(() => import("./features/auth/AuthPage").then((m) => ({ default: m.AuthPage })));
const OnboardingIntroPage = lazy(() => import("./features/auth/OnboardingIntroPage").then((m) => ({ default: m.OnboardingIntroPage })));
const CreateHouseholdPage = lazy(() => import("./features/auth/CreateHouseholdPage").then((m) => ({ default: m.CreateHouseholdPage })));
const AcceptInvitePage = lazy(() => import("./features/invite/AcceptInvitePage").then((m) => ({ default: m.AcceptInvitePage })));
const AddTaskSheet = lazy(() => import("./sheets/AddTaskSheet").then((m) => ({ default: m.AddTaskSheet })));
const BoodschapToevoegSheet = lazy(() => import("./sheets/BoodschapToevoegSheet").then((m) => ({ default: m.BoodschapToevoegSheet })));
const EditTaskSheet = lazy(() => import("./sheets/EditTaskSheet").then((m) => ({ default: m.EditTaskSheet })));
const NewRoomSheet = lazy(() => import("./sheets/NewRoomSheet").then((m) => ({ default: m.NewRoomSheet })));
const EditRoomSheet = lazy(() => import("./sheets/EditRoomSheet").then((m) => ({ default: m.EditRoomSheet })));
const NewRoutineSheet = lazy(() => import("./sheets/NewRoutineSheet").then((m) => ({ default: m.NewRoutineSheet })));
const EditRoutineSheet = lazy(() => import("./sheets/EditRoutineSheet").then((m) => ({ default: m.EditRoutineSheet })));
const HouseholdSheet = lazy(() => import("./sheets/HouseholdSheet").then((m) => ({ default: m.HouseholdSheet })));
const ProfielSheet = lazy(() => import("./sheets/ProfielSheet").then((m) => ({ default: m.ProfielSheet })));
const WachtwoordSheet = lazy(() => import("./sheets/WachtwoordSheet").then((m) => ({ default: m.WachtwoordSheet })));

function LazyOverlay({ children }: { children: ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Navigate to="/vandaag" replace />} />
        <Route path="/vandaag" element={<PageTx><VandaagPage /></PageTx>} />
        <Route path="/huis" element={<PageTx><HuisPage /></PageTx>} />
        <Route path="/huis/:roomId" element={<PageTx><HuisPage /></PageTx>} />
        <Route path="/routines" element={<PageTx><RoutinesPage /></PageTx>} />
        <Route path="/routines/:bundleId/starten" element={<PageTx><RoutineSessionPage /></PageTx>} />
        <Route path="/samen" element={<PageTx><SamenPage /></PageTx>} />
        <Route path="/meer" element={<PageTx><MeerPage /></PageTx>} />
        <Route path="/taken" element={<PageTx><TakenPage /></PageTx>} />
        <Route path="/boodschappen" element={<PageTx><BoodschappenPage /></PageTx>} />
        <Route path="/focus" element={<PageTx><FocusPage /></PageTx>} />
        <Route path="/dev/design-system" element={<PageTx><DesignSystemPage /></PageTx>} />
      </Routes>
    </AnimatePresence>
  );
}

function PageTx({ children }: { children: ReactNode }) {
  return (
    // With AnimatePresence mode="wait" the exit plays before the next page may enter,
    // so the exit gets an explicit short duration — the default would roughly double
    // how long a tab switch feels.
    <motion.div initial={pageIn} animate={{ opacity: 1, y: 0, transition: pageTx }} exit={{ opacity: 0, y: -6, transition: { duration: 0.12 } }}>
      {children}
    </motion.div>
  );
}

/** The existing app shell — tabs, sheets, FAB. Assumes useCuraStore is already ready. */
function MainShell() {
  useFocusTimer();
  usePushReconcile();

  // Routine-sessie is een echte takeover (§5 Routines) — geen onderbalk/gradient
  // eronder, minder scroll-bottom-padding omdat er geen navbar te vrijwaren is.
  const { pathname } = useLocation();
  const isRoutineSession = Boolean(matchPath("/routines/:bundleId/starten", pathname));
  const navTint = DAYPART_NAV[useDaypart()];

  const scrollRef = useRef<HTMLDivElement>(null);
  const refresh = useCuraStore((s) => s.refresh);
  const { pull, state: pullState } = usePullToRefresh(scrollRef, refresh);

  const [showAdd, setShowAdd] = useState(false);
  const [showAddBoodschap, setShowAddBoodschap] = useState(false);
  const [addRoomId, setAddRoomId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [showNewRoom, setShowNewRoom] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [showNewRoutine, setShowNewRoutine] = useState(false);
  const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null);
  const [showHousehold, setShowHousehold] = useState(false);
  const [showProfiel, setShowProfiel] = useState(false);
  const [showWachtwoord, setShowWachtwoord] = useState(false);

  const sheetActions: SheetActions = useMemo(
    () => ({
      openAddTask: (roomId?: string) => { setAddRoomId(roomId ?? null); setShowAdd(true); },
      openAddBoodschap: () => setShowAddBoodschap(true),
      openEditTask: (taskId) => setEditingTaskId(taskId),
      openNewRoom: () => setShowNewRoom(true),
      openEditRoom: (roomId) => setEditingRoomId(roomId),
      openNewRoutine: () => setShowNewRoutine(true),
      openEditRoutine: (bundleId) => setEditingRoutineId(bundleId),
      openHousehold: () => setShowHousehold(true),
      openProfiel: () => setShowProfiel(true),
    }),
    [],
  );

  // Wekker → taak: in-app reminders (toast/OS-notification) and taps on a
  // closed-app push both open the task. Mounted here (persistent shell) so it
  // can reach openEditTask; sheetActions is stable, so the deps don't churn.
  useTaskReminders(sheetActions.openEditTask);
  useTaskDeepLink(sheetActions.openEditTask);

  return (
    <SheetContext.Provider value={sheetActions}>
      <div className="fixed inset-0 flex flex-col bg-background overflow-hidden">
        <AppBackground />

        {!isRoutineSession && (
          <div className="absolute bottom-0 left-0 right-0 pointer-events-none z-30" style={{
            height: "calc(6rem + var(--safe-bottom))",
            background: `linear-gradient(to top,color-mix(in srgb, ${navTint} 96%, transparent) 0%,color-mix(in srgb, ${navTint} 60%, transparent) 45%,transparent 100%)`,
          }} />
        )}

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto scrollbar-hide relative z-10"
          style={{
            paddingTop: "var(--safe-top)",
            paddingLeft: "var(--safe-left)",
            paddingRight: "var(--safe-right)",
            paddingBottom: isRoutineSession ? "var(--safe-bottom)" : "calc(6rem + var(--safe-bottom))",
            // We own the pull gesture at the top — keep native overscroll/PTR out of it.
            overscrollBehaviorY: "contain",
          }}
        >
          {/* Content follows the finger during a pull, springs back on release. */}
          <div
            style={{
              transform: pull ? `translateY(${pull}px)` : undefined,
              transition: pullState === "pulling" ? "none" : "transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
            }}
          >
            <Suspense fallback={<PageSkeleton />}>
              <AnimatedRoutes />
            </Suspense>
          </div>
        </div>
        <PullToRefreshIndicator pull={pull} state={pullState} />

        <FocusMiniPill />

        {!isRoutineSession && (
          <BottomNav showAdd={showAdd} onAdd={() => { setAddRoomId(null); setShowAdd((s) => !s); }} />
        )}

        <AnimatePresence>
          {showAdd && <LazyOverlay key="add"><AddTaskSheet roomId={addRoomId} onClose={() => setShowAdd(false)} /></LazyOverlay>}
          {showAddBoodschap && <LazyOverlay key="add-boodschap"><BoodschapToevoegSheet onClose={() => setShowAddBoodschap(false)} /></LazyOverlay>}
          {editingTaskId && <LazyOverlay key="edit-task"><EditTaskSheet taskId={editingTaskId} onClose={() => setEditingTaskId(null)} /></LazyOverlay>}
          {showNewRoutine && <LazyOverlay key="nr"><NewRoutineSheet onClose={() => setShowNewRoutine(false)} /></LazyOverlay>}
          {editingRoutineId && <LazyOverlay key="er"><EditRoutineSheet bundleId={editingRoutineId} onClose={() => setEditingRoutineId(null)} /></LazyOverlay>}
          {showNewRoom && <LazyOverlay key="room"><NewRoomSheet onClose={() => setShowNewRoom(false)} /></LazyOverlay>}
          {editingRoomId && <LazyOverlay key="edit"><EditRoomSheet roomId={editingRoomId} onClose={() => setEditingRoomId(null)} /></LazyOverlay>}
          {showHousehold && (
            <LazyOverlay key="hs">
              <HouseholdSheet
                onClose={() => setShowHousehold(false)}
                onOpenProfiel={() => { setShowHousehold(false); setShowProfiel(true); }}
              />
            </LazyOverlay>
          )}
          {showProfiel && (
            <LazyOverlay key="prof">
              <ProfielSheet
                onOpenHousehold={() => { setShowProfiel(false); setShowHousehold(true); }}
                onOpenWachtwoord={() => { setShowProfiel(false); setTimeout(() => setShowWachtwoord(true), 160); }}
                onClose={() => setShowProfiel(false)}
              />
            </LazyOverlay>
          )}
          {showWachtwoord && <LazyOverlay key="pw"><WachtwoordSheet onClose={() => setShowWachtwoord(false)} /></LazyOverlay>}
        </AnimatePresence>
      </div>
    </SheetContext.Provider>
  );
}

/** Auth/household gating in front of MainShell — loading -> signed out -> no household -> the app. */
function Gate() {
  const { status } = useAuth();
  const init = useCuraStore((s) => s.init);
  const reset = useCuraStore((s) => s.reset);
  const ready = useCuraStore((s) => s.ready);
  const initError = useCuraStore((s) => s.initError);
  const households = useCuraStore((s) => s.households);
  const { seen: onboardingSeen, markSeen: markOnboardingSeen } = useOnboardingSeen();

  useEffect(() => {
    if (status === "signedIn") init();
  }, [status, init]);

  // Clear stale data from the previous session so a second sign-in never
  // briefly flashes another user's households/tasks while init() is in flight.
  const prevStatusRef = useRef<string>("loading");
  useEffect(() => {
    if (prevStatusRef.current === "signedIn" && status === "signedOut") reset();
    prevStatusRef.current = status;
  }, [status, reset]);

  if (status === "loading") return <FullScreenSkeleton />;
  if (status === "signedOut") return <Suspense fallback={<FullScreenSkeleton />}><AuthPage /></Suspense>;
  if (initError) return <FullScreenError onRetry={() => void init()} />;
  if (!ready) return <FullScreenSkeleton />;
  if (households.length === 0) {
    if (!onboardingSeen) return <Suspense fallback={<FullScreenSkeleton />}><OnboardingIntroPage onDone={markOnboardingSeen} /></Suspense>;
    return <Suspense fallback={<FullScreenSkeleton />}><CreateHouseholdPage /></Suspense>;
  }
  return <MainShell />;
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <Toaster position="top-center" toastOptions={{
          style: {
            background: "var(--card)", color: "var(--foreground)",
            border: "1px solid var(--border)", borderRadius: "0.875rem",
            fontSize: "0.875rem", fontFamily: "'Plus Jakarta Sans',sans-serif",
            boxShadow: SHADOW_LG,
          },
        }} />
        <ConnectivityBanner />
        <UpdatePrompt />
        <ErrorBoundary>
          <Routes>
            <Route path="/uitnodiging/:token" element={<Suspense fallback={<FullScreenSkeleton />}><AcceptInvitePage /></Suspense>} />
            <Route path="/*" element={<Gate />} />
          </Routes>
        </ErrorBoundary>
      </BrowserRouter>
    </MotionConfig>
  );
}
