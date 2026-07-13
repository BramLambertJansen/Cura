import { TaakRij } from 'cura';

// TaskView is a plain derived view-model (see src/data/types.ts) — construct
// realistic literals; the fields a screen shows are title/description/room/
// duration/intervalDays/wekkerLabel/claimedBy plus the done/planned booleans.
const noop = () => {};

export function Open() {
  return (
    <TaakRij
      task={{ id: 't1', title: 'Aanrecht afnemen', room: 'Keuken', duration: '5 min', planned: false, done: false }}
      onToggle={noop}
      onEdit={noop}
    />
  );
}

export function MetDetails() {
  return (
    <TaakRij
      task={{
        id: 't2',
        title: 'Planten water geven',
        description: 'De grote in de woonkamer eerst',
        room: 'Woonkamer',
        duration: '10 min',
        intervalDays: 7,
        planned: false,
        done: false,
      }}
      onToggle={noop}
      onEdit={noop}
      onStartFocus={noop}
    />
  );
}

export function MetWekker() {
  return (
    <TaakRij
      task={{ id: 't3', title: 'Vuilnis buiten zetten', room: 'Keuken', wekkerLabel: 'Wekker om 19:00', planned: false, done: false }}
      onToggle={noop}
      onEdit={noop}
    />
  );
}

export function Geclaimd() {
  return (
    <TaakRij
      showClaim
      task={{ id: 't4', title: 'Badkamer schoonmaken', room: 'Badkamer', duration: '20 min', claimedBy: 'Sanne', planned: false, done: false }}
      onToggle={noop}
      onEdit={noop}
      onClaim={noop}
      onUnclaim={noop}
    />
  );
}

export function Afgevinkt() {
  return (
    <TaakRij
      task={{ id: 't5', title: 'Was ophangen', room: 'Wasruimte', doneBy: 'Tom', doneAt: '08:42', planned: false, done: true }}
      onToggle={noop}
      onEdit={noop}
    />
  );
}
