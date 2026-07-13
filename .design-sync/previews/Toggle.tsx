import { Toggle } from 'cura';

// Switch for a single on/off setting — sage track when on, quiet grey when off.
// Controlled, so each cell pins a state and pairs it with the label it would
// carry in a settings row.
const noop = () => {};
const rij = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
  width: 220,
} as const;
const labelStyle = { fontSize: 14, fontWeight: 500, color: 'var(--foreground)' } as const;

export function Aan() {
  return (
    <div style={rij}>
      <span style={labelStyle}>Herinneringen</span>
      <Toggle checked onChange={noop} label="Herinneringen" />
    </div>
  );
}

export function Uit() {
  return (
    <div style={rij}>
      <span style={labelStyle}>Geluid</span>
      <Toggle checked={false} onChange={noop} label="Geluid" />
    </div>
  );
}
