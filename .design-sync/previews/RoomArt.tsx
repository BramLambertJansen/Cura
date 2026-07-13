import { RoomArt } from 'cura';
import { UtensilsCrossed, Sofa } from 'lucide-react';

// RoomArt is the watercolor panel that fills its container and fades toward one
// edge. It takes a full IconOption literal; we OMIT `image` so the designed
// art-less fallback renders — a calm tinted wash with the large line icon,
// which keeps the panel's shape whether or not artwork exists. Wrapped at a
// phone-ish width so the `w-full` panel reads as the card panel it is.
const keuken = { key: 'utensils', icon: <UtensilsCrossed size={18} aria-hidden="true" />, iconLg: <UtensilsCrossed size={40} aria-hidden="true" />, color: '#B8924A', label: 'Keuken', defaultName: 'Keuken' };
const woonkamer = { key: 'sofa', icon: <Sofa size={18} aria-hidden="true" />, iconLg: <Sofa size={40} aria-hidden="true" />, color: '#8B6EA8', label: 'Woonkamer', defaultName: 'Woonkamer' };

// The panel height is set on the wrapper via inline style (arbitrary Tailwind
// sizing like `h-28` is NOT in the precompiled preview CSS, so it no-ops and
// the panel collapses to 0 height); the component fills it with w-full/h-full,
// which ARE compiled.
const frame = { width: 320, height: 112 } as const;

export function Paneel() {
  return (
    <div style={frame}>
      <RoomArt ic={keuken} color={keuken.color} className="w-full h-full rounded-2xl" fade="right" />
    </div>
  );
}

export function PaneelOnder() {
  return (
    <div style={frame}>
      <RoomArt ic={woonkamer} color={woonkamer.color} className="w-full h-full rounded-2xl" fade="bottom" />
    </div>
  );
}
