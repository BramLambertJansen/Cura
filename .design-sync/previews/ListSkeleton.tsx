import { ListSkeleton } from 'cura';

// A stack of card placeholders for a list of taken/kamers/routines still on its
// way. Each card breathes with a slight per-card delay, so the list ripples
// gently rather than blinking in lockstep. Wrapped at a phone-ish width.
const frame = { width: 320 } as const;

export function Takenlijst() {
  return <div style={frame}><ListSkeleton count={3} /></div>;
}

export function KorteLijst() {
  return <div style={frame}><ListSkeleton count={2} /></div>;
}
