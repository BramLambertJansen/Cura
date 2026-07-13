import { KeuzeChip } from 'cura';

// Selectable pill for pick-one / pick-optional rows. Shown as a filter row so
// both the selected (sage) and unselected (inset) states read side by side.
export function Filterrij() {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <KeuzeChip selected onClick={() => {}}>Alle</KeuzeChip>
      <KeuzeChip selected={false} onClick={() => {}}>Keuken</KeuzeChip>
      <KeuzeChip selected={false} onClick={() => {}}>Badkamer</KeuzeChip>
      <KeuzeChip selected={false} onClick={() => {}}>Woonkamer</KeuzeChip>
    </div>
  );
}

export function DuurFilter() {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <KeuzeChip selected={false} onClick={() => {}}>Alle</KeuzeChip>
      <KeuzeChip selected onClick={() => {}}>≤ 15 min</KeuzeChip>
      <KeuzeChip selected={false} onClick={() => {}}>15–45 min</KeuzeChip>
      <KeuzeChip selected={false} onClick={() => {}}>45+ min</KeuzeChip>
    </div>
  );
}
