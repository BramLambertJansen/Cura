import { IconButton } from 'cura';
import { X, ChevronLeft, Plus } from 'lucide-react';

// Round icon-only button. `tone` picks the fill: secondary for on-sheet chrome
// (the close X), card for a floating button over the page, primary for the
// sage-gradient add CTA. Shown as a row so the three fills read side by side.
const noop = () => {};
const row = { display: 'flex', gap: 12, alignItems: 'center' } as const;

export function Varianten() {
  return (
    <div style={row}>
      <IconButton
        tone="card"
        label="Terug"
        onClick={noop}
        icon={<ChevronLeft size={18} className="text-foreground" aria-hidden="true" />}
      />
      <IconButton
        tone="secondary"
        label="Sluiten"
        onClick={noop}
        icon={<X size={16} className="text-muted-foreground" aria-hidden="true" />}
      />
      <IconButton
        tone="primary"
        label="Taak toevoegen"
        onClick={noop}
        icon={<Plus size={18} className="text-white" aria-hidden="true" />}
      />
    </div>
  );
}

export function Groottes() {
  return (
    <div style={row}>
      <IconButton size={8} tone="secondary" label="Sluiten" onClick={noop}
        icon={<X size={14} className="text-muted-foreground" aria-hidden="true" />} />
      <IconButton size={9} tone="secondary" label="Sluiten" onClick={noop}
        icon={<X size={16} className="text-muted-foreground" aria-hidden="true" />} />
      <IconButton size={10} tone="secondary" label="Sluiten" onClick={noop}
        icon={<X size={18} className="text-muted-foreground" aria-hidden="true" />} />
    </div>
  );
}
