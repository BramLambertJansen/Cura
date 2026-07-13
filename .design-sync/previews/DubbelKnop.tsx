import { DubbelKnop } from 'cura';

// Cancel / confirm action pair that closes out an edit sheet. Wrapped at a
// phone-ish width so the two flex-1 halves read as the bottom action row they
// are. The confirm half carries the sage gradient; the cancel half is a quiet
// hairline button.
const frame = { width: 320 } as const;
const noop = () => {};

export function Default() {
  return (
    <div style={frame}>
      <DubbelKnop label="Opslaan" onCancel={noop} onConfirm={noop} />
    </div>
  );
}

export function Verwijderen() {
  return (
    <div style={frame}>
      <DubbelKnop label="Verwijderen" onCancel={noop} onConfirm={noop} />
    </div>
  );
}

export function Uitgeschakeld() {
  return (
    <div style={frame}>
      <DubbelKnop label="Toevoegen" disabled onCancel={noop} onConfirm={noop} />
    </div>
  );
}
