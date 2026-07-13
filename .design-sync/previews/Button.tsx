import { Button } from 'cura';
import { Plus, Trash2, SlidersHorizontal, ArrowRight } from 'lucide-react';

// The shadcn base button (cva). Not full-width — it sizes to its label — so the
// cells lay several out inline to read the variant + size sweeps at a glance.
// Dutch labels drawn from the household-planner flows (opslaan/annuleren/…).
const noop = () => {};
const row = { display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' } as const;

export function Varianten() {
  return (
    <div style={row}>
      <Button onClick={noop}>Opslaan</Button>
      <Button variant="secondary" onClick={noop}>Annuleren</Button>
      <Button variant="outline" onClick={noop}>Filteren</Button>
      <Button variant="ghost" onClick={noop}>Overslaan</Button>
      <Button variant="destructive" onClick={noop}>Verwijderen</Button>
    </div>
  );
}

export function Formaten() {
  return (
    <div style={row}>
      <Button size="sm" onClick={noop}>Klein</Button>
      <Button onClick={noop}>Standaard</Button>
      <Button size="lg" onClick={noop}>Groot</Button>
    </div>
  );
}

export function MetIcoon() {
  return (
    <div style={row}>
      <Button onClick={noop}>
        <Plus aria-hidden="true" /> Nieuwe taak
      </Button>
      <Button variant="outline" onClick={noop}>
        <SlidersHorizontal aria-hidden="true" /> Filters
      </Button>
      <Button variant="destructive" size="icon" aria-label="Verwijderen" onClick={noop}>
        <Trash2 aria-hidden="true" />
      </Button>
    </div>
  );
}

export function Tekstknop() {
  return (
    <div style={row}>
      <Button variant="link" onClick={noop}>
        Meer weten <ArrowRight aria-hidden="true" />
      </Button>
    </div>
  );
}
