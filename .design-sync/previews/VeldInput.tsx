import { VeldInput } from 'cura';

// Rounded field input with a per-state border/shadow machine. Wrapped at a
// sheet-ish width so the states read as real form rows, not stretched bars.
const noop = () => {};
const frame = { width: 340 } as const;

export function Ingevuld() {
  return (
    <div style={frame}>
      <VeldInput value="Aanrecht afnemen" onChange={noop} placeholder="Wat moet er gebeuren?" />
    </div>
  );
}

export function Email() {
  return (
    <div style={frame}>
      <VeldInput type="email" value="sanne@huishouden.nl" onChange={noop} placeholder="E-mailadres" />
    </div>
  );
}

export function Wachtwoord() {
  return (
    <div style={frame}>
      <VeldInput type="password" value="zonnebloem24" onChange={noop} placeholder="Wachtwoord" />
    </div>
  );
}

export function Ongeldig() {
  return (
    <div style={frame}>
      <VeldInput invalid value="sanne@" onChange={noop} placeholder="E-mailadres" />
    </div>
  );
}

export function Uitgeschakeld() {
  return (
    <div style={frame}>
      <VeldInput disabled value="Keuken" onChange={noop} placeholder="Kamer" />
    </div>
  );
}
