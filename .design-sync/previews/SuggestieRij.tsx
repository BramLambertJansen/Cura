import { SuggestieRij } from 'cura';

// A "Misschien handig"-suggestion: plan it (green +) or wave it off (grey ×).
// The reason line is DERIVED from the task, never an exact day count:
//   dueHint "Waarschijnlijk weer toe"  -> "Waarschijnlijk weer toe"
//   else wekkerLabel set                -> "Staat met een wekker"
//   else                                -> "Past goed tussendoor"
// The row's own fill is a flat --card; in-app it nests in the warmer
// --card-active "Misschien handig" group-card, so the preview supplies that
// container for contrast + faithful context.
const noop = () => {};

function Groep({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl bg-card-active border border-border/60 px-3 py-3"
      style={{ boxShadow: 'var(--shadow-card)' }}>
      {children}
    </div>
  );
}

export function WeerToe() {
  return (
    <Groep>
      <SuggestieRij
        task={{ id: 's1', title: 'Badkamer schoonmaken', room: 'Badkamer', duration: '20 min', dueHint: 'Waarschijnlijk weer toe', planned: false, done: false }}
        onPlan={noop}
        onNietVandaag={noop}
      />
    </Groep>
  );
}

export function MetWekker() {
  return (
    <Groep>
      <SuggestieRij
        task={{ id: 's2', title: 'Vaatwasser uitruimen', room: 'Keuken', wekkerLabel: 'Wekker om 09:00', planned: false, done: false }}
        onPlan={noop}
        onNietVandaag={noop}
      />
    </Groep>
  );
}

export function Tussendoor() {
  return (
    <Groep>
      <SuggestieRij
        task={{ id: 's3', title: 'Post ophalen', room: 'Hal', duration: '5 min', planned: false, done: false }}
        onPlan={noop}
        onNietVandaag={noop}
      />
    </Groep>
  );
}
