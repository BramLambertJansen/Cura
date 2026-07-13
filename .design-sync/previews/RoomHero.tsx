import { RoomHero } from 'cura';
import { UtensilsCrossed, Sofa } from 'lucide-react';

// RoomHero is the full-bleed watercolor header for the room-detail screen. It
// owns the floating back/edit control bar. Without art (the case in the capture
// sandbox) it degrades to just that padded control bar — so we place it inside
// a relative cream frame that stands in for the room-detail surface the
// controls float over, giving the bar the context it reads against in the app.
const keuken = { key: 'utensils', icon: <UtensilsCrossed size={18} aria-hidden="true" />, iconLg: <UtensilsCrossed size={40} aria-hidden="true" />, color: '#B8924A', label: 'Keuken', defaultName: 'Keuken' };
const woonkamer = { key: 'sofa', icon: <Sofa size={18} aria-hidden="true" />, iconLg: <Sofa size={40} aria-hidden="true" />, color: '#8B6EA8', label: 'Woonkamer', defaultName: 'Woonkamer' };

const noop = () => {};

export function Bedieningsbalk() {
  return (
    <div style={{ position: 'relative', width: 360, height: 180, background: 'var(--card-art)', borderRadius: 16, overflow: 'hidden' }}>
      <RoomHero ic={keuken} onBack={noop} onEdit={noop} editLabel="Kamer bewerken" />
    </div>
  );
}

export function OverKamerkleur() {
  // Same floating controls over a room-tinted detail surface, so the back/edit
  // buttons read clearly against a warmer header than plain cream.
  return (
    <div style={{ position: 'relative', width: 360, height: 180, background: 'color-mix(in srgb, #8B6EA8 12%, var(--card-art))', borderRadius: 16, overflow: 'hidden' }}>
      <RoomHero ic={woonkamer} onBack={noop} onEdit={noop} editLabel="Kamer bewerken" />
    </div>
  );
}
