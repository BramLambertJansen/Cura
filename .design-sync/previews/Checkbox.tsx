import { Checkbox } from 'cura';

// Round task checkbox — sage fill + white check when done, hairline ring when
// open. Controlled, so each cell pins a state and pairs it with the task it
// would sit beside in a list.
const noop = () => {};
const rij = { display: 'flex', alignItems: 'center', gap: 12 } as const;
const taak = { fontSize: 15, color: 'var(--foreground)' } as const;
const taakGedaan = {
  fontSize: 15,
  color: 'var(--muted-foreground)',
  textDecoration: 'line-through',
} as const;

export function Aangevinkt() {
  return (
    <div style={rij}>
      <Checkbox checked onToggle={noop} label="Was ophangen" />
      <span style={taakGedaan}>Was ophangen</span>
    </div>
  );
}

export function Open() {
  return (
    <div style={rij}>
      <Checkbox checked={false} onToggle={noop} label="Planten water geven" />
      <span style={taak}>Planten water geven</span>
    </div>
  );
}

export function Groottes() {
  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
      <Checkbox size="md" checked onToggle={noop} label="Klein" />
      <Checkbox size="lg" checked onToggle={noop} label="Groot" />
    </div>
  );
}
