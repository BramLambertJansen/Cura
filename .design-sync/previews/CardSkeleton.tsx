import { CardSkeleton } from 'cura';

// One card-shaped placeholder that mirrors the real Card chrome (hairline
// border, rounded corners, matching padding) so nothing jumps once the real
// content lands. The bars breathe via CSS — a slow, soft fade rather than a
// spinner — so a static shot at any opacity still reads as "still loading".
// Wrapped at a phone-ish width so the card doesn't stretch across the cell.
const frame = { width: 320 } as const;

export function Standaard() {
  return <div style={frame}><CardSkeleton /></div>;
}

export function DrieRegels() {
  return <div style={frame}><CardSkeleton lines={3} /></div>;
}
