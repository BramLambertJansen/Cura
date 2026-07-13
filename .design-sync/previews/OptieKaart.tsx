import { OptieKaart } from 'cura';
import { Check } from 'lucide-react';

// Larger selectable card-tile — a border-2 tile with an animated tint fill when
// selected. Compose the label (+ a check badge) as children. Shown as the
// room-picker grid and the interval presets, each with one option chosen.
const noop = () => {};

export function Kamers() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, width: 300 }}>
      <OptieKaart selected selectedBg={14} selectedBorder={70} onClick={noop} ariaLabel="Keuken" className="px-4 py-4 flex items-center justify-between">
        <span className="text-sm font-semibold" style={{ color: 'var(--primary)' }}>Keuken</span>
        <Check size={16} strokeWidth={2.5} className="text-primary" aria-hidden="true" />
      </OptieKaart>
      <OptieKaart selected={false} onClick={noop} ariaLabel="Badkamer" className="px-4 py-4 flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">Badkamer</span>
      </OptieKaart>
      <OptieKaart selected={false} onClick={noop} ariaLabel="Woonkamer" className="px-4 py-4 flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">Woonkamer</span>
      </OptieKaart>
      <OptieKaart selected={false} onClick={noop} ariaLabel="Slaapkamer" className="px-4 py-4 flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">Slaapkamer</span>
      </OptieKaart>
    </div>
  );
}

export function Interval() {
  return (
    <div style={{ display: 'flex', gap: 10, width: 320 }}>
      <OptieKaart selected={false} onClick={noop} ariaLabel="Dagelijks" className="flex-1 px-3 py-4 text-center">
        <span className="text-sm font-medium text-muted-foreground">Dagelijks</span>
      </OptieKaart>
      <OptieKaart selected selectedBg={16} selectedBorder={80} onClick={noop} ariaLabel="Wekelijks" className="flex-1 px-3 py-4 text-center">
        <span className="text-sm font-semibold" style={{ color: 'var(--primary)' }}>Wekelijks</span>
      </OptieKaart>
      <OptieKaart selected={false} onClick={noop} ariaLabel="Maandelijks" className="flex-1 px-3 py-4 text-center">
        <span className="text-sm font-medium text-muted-foreground">Maandelijks</span>
      </OptieKaart>
    </div>
  );
}
