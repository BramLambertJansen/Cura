import { FullScreenSkeleton } from 'cura';

// The app's first moment: a full-screen calm loader on the cream background,
// with a softly breathing logo mark and an italic "Even rustig opstarten…".
// It gates auth-resolving / store-init / first-load Suspense, so it should feel
// like the splash screen rather than missing content. Renders full-bleed
// (cardMode "single" + a phone viewport are set in config), so no wrapper here.
export function Opstarten() {
  return <FullScreenSkeleton />;
}
