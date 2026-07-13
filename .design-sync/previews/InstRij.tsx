import { InstRij, Toggle } from 'cura';
import { Bell, Globe, Info, ChevronRight } from 'lucide-react';

// A single settings/menu row: lead icon + label + a right slot. Shown inside its
// natural grouped-card container so the row reads the way it does in a settings
// list. Three canonical right slots: a switch, a value + disclosure, and a plain
// disclosure chevron.
const noop = () => {};

function Groep({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--secondary)', width: 340 }}>
      {children}
    </div>
  );
}

export function MetToggle() {
  return (
    <Groep>
      <InstRij
        icon={<Bell size={18} aria-hidden="true" />}
        label="Meldingen"
        right={<Toggle checked onChange={noop} label="Meldingen" />}
      />
    </Groep>
  );
}

export function MetWaarde() {
  return (
    <Groep>
      <InstRij
        icon={<Globe size={18} aria-hidden="true" />}
        label="Taal"
        onClick={noop}
        right={
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            Nederlands
            <ChevronRight size={16} aria-hidden="true" />
          </span>
        }
      />
    </Groep>
  );
}

export function Navigatie() {
  return (
    <Groep>
      <InstRij
        icon={<Info size={18} aria-hidden="true" />}
        label="Over Cura"
        onClick={noop}
        right={<ChevronRight size={16} className="text-muted-foreground" aria-hidden="true" />}
      />
    </Groep>
  );
}
