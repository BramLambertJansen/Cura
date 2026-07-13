import { TijdlijnTaakRij } from 'cura';

// The Vandaag timeline variant of TaakRij. Unlike TaakRij, these rows carry no
// card chrome of their own — they sit directly on a shared white group-card
// (the dagdeel-tijdlijn in VandaagPage). The preview supplies that surface so
// each row reads in the context it's designed for. TaskView props are plain
// literals (types are erased at build).
const noop = () => {};

function Groep({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-[1.6rem] bg-card border border-border/60 px-4 py-2"
      style={{ boxShadow: 'var(--shadow-card)' }}>
      {children}
    </div>
  );
}

export function Open() {
  return (
    <Groep>
      <TijdlijnTaakRij
        task={{ id: 't1', title: 'Aanrecht afnemen', room: 'Keuken', duration: '5 min', planned: true, done: false }}
        onToggle={noop}
        onEdit={noop}
        onDismiss={noop}
      />
    </Groep>
  );
}

export function MetInterval() {
  return (
    <Groep>
      <TijdlijnTaakRij
        task={{
          id: 't2',
          title: 'Planten water geven',
          description: 'De grote in de woonkamer eerst',
          room: 'Woonkamer',
          duration: '10 min',
          intervalDays: 7,
          planned: true,
          done: false,
        }}
        onToggle={noop}
        onEdit={noop}
        onDismiss={noop}
      />
    </Groep>
  );
}

export function MetWekker() {
  return (
    <Groep>
      <TijdlijnTaakRij
        task={{ id: 't3', title: 'Vuilnis buiten zetten', room: 'Keuken', wekkerLabel: 'Wekker om 19:00', planned: true, done: false }}
        onToggle={noop}
        onEdit={noop}
        onDismiss={noop}
      />
    </Groep>
  );
}

export function Afgevinkt() {
  return (
    <Groep>
      <TijdlijnTaakRij
        task={{ id: 't4', title: 'Bed opmaken', room: 'Slaapkamer', duration: '3 min', planned: true, done: true }}
        onToggle={noop}
        onEdit={noop}
        onDismiss={noop}
      />
    </Groep>
  );
}
