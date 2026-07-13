import { FullScreenError } from 'cura';

// A calm full-screen error for a failed initial load — mirrors the loader's
// cream background and safe-area treatment so a failure feels like a gentle
// "let's try again", not a crash. Its watercolor illustration won't load in the
// sandbox, but the "Laden lukte even niet" heading, the reassuring line, and
// the "Opnieuw proberen" button carry the screen. Renders full-bleed (cardMode
// "single" + a phone viewport are set in config), so no wrapper here.
export function Herstel() {
  return <FullScreenError onRetry={() => {}} />;
}
