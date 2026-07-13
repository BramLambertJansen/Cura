import { TaakToevoegRij } from 'cura';

// Text field + sage "+" button for building a routine's task list. The +
// disables itself while the field is empty.
const noop = () => {};
const frame = { width: 340 } as const;

export function Ingevuld() {
  return (
    <div style={frame}>
      <TaakToevoegRij value="Koelkast schoonmaken" onChange={noop} onAdd={noop} placeholder="Nog een taak…" />
    </div>
  );
}

export function Leeg() {
  return (
    <div style={frame}>
      <TaakToevoegRij value="" onChange={noop} onAdd={noop} placeholder="Nog een taak…" />
    </div>
  );
}
