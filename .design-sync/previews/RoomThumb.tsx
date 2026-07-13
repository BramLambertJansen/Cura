import { RoomThumb } from 'cura';
import { UtensilsCrossed, Droplets, BedDouble, Sofa } from 'lucide-react';

// RoomThumb is the small square room avatar. It takes a full IconOption
// literal (not a key). We OMIT `image` so the clean tinted fallback (a soft
// color wash + lucide line icon) renders immediately — the legitimate art-less
// state, and the only thing that renders in the capture sandbox.
const keuken = { key: 'utensils', icon: <UtensilsCrossed size={18} aria-hidden="true" />, iconLg: <UtensilsCrossed size={40} aria-hidden="true" />, color: '#B8924A', label: 'Keuken', defaultName: 'Keuken' };
const badkamer = { key: 'droplets', icon: <Droplets size={18} aria-hidden="true" />, iconLg: <Droplets size={40} aria-hidden="true" />, color: '#5A8FA8', label: 'Badkamer', defaultName: 'Badkamer' };
const slaapkamer = { key: 'bed', icon: <BedDouble size={18} aria-hidden="true" />, iconLg: <BedDouble size={40} aria-hidden="true" />, color: '#496E46', label: 'Slaapkamer', defaultName: 'Slaapkamer' };
const woonkamer = { key: 'sofa', icon: <Sofa size={18} aria-hidden="true" />, iconLg: <Sofa size={40} aria-hidden="true" />, color: '#8B6EA8', label: 'Woonkamer', defaultName: 'Woonkamer' };

export function Kamers() {
  return (
    <div className="flex items-center gap-3">
      <RoomThumb ic={keuken} color={keuken.color} className="w-16 h-16" />
      <RoomThumb ic={badkamer} color={badkamer.color} className="w-16 h-16" />
      <RoomThumb ic={slaapkamer} color={slaapkamer.color} className="w-16 h-16" />
      <RoomThumb ic={woonkamer} color={woonkamer.color} className="w-16 h-16" />
    </div>
  );
}

export function Groot() {
  // The picker-sized tile: `large` swaps the fallback to the 40px iconLg. Size
  // comes from an inline-styled wrapper — arbitrary Tailwind sizing like `w-28`
  // is NOT in the precompiled preview CSS (only utilities used in Cura source
  // are), so it no-ops; w-full/h-full ARE compiled and fill the wrapper.
  return (
    <div style={{ width: 112, height: 112 }}>
      <RoomThumb ic={keuken} color={keuken.color} className="w-full h-full" large />
    </div>
  );
}
