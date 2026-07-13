import { RingProgress } from 'cura';

// Thin progress ring for a member's or room's share of the week. `value` is
// 0..1 and drives the colour: sage while there's work left, a lighter green as
// it nears done (> 0.7), and warm gold at a full 100%. Labelled below since the
// ring itself carries no text.
const cel = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 } as const;
const label = { fontSize: 13, fontWeight: 500, color: 'var(--muted-foreground)' } as const;

export function Drempels() {
  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-end' }}>
      <div style={cel}><RingProgress value={0.35} size={48} stroke={4} /><span style={label}>35%</span></div>
      <div style={cel}><RingProgress value={0.7} size={48} stroke={4} /><span style={label}>70%</span></div>
      <div style={cel}><RingProgress value={0.9} size={48} stroke={4} /><span style={label}>90%</span></div>
      <div style={cel}><RingProgress value={1} size={48} stroke={4} /><span style={label}>Klaar</span></div>
    </div>
  );
}

export function Groottes() {
  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
      <RingProgress value={0.65} size={32} stroke={3} />
      <RingProgress value={0.65} size={48} stroke={4} />
      <RingProgress value={0.65} size={64} stroke={5} />
    </div>
  );
}
