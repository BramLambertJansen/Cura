import { GroupCard, InstRij, Toggle } from 'cura';
import { Bell, Moon, Globe, User, Users, ChevronRight } from 'lucide-react';

// Rounded container that groups InstRij rows with a hairline divider between
// them — the settings-list pattern. Children is an array of rows.
const noop = () => {};

export function Instellingen() {
  return (
    <GroupCard>
      {[
        <InstRij
          key="meld"
          icon={<Bell size={18} aria-hidden="true" />}
          label="Meldingen"
          right={<Toggle checked onChange={noop} label="Meldingen" />}
        />,
        <InstRij
          key="thema"
          icon={<Moon size={18} aria-hidden="true" />}
          label="Donker thema"
          right={<Toggle checked={false} onChange={noop} label="Donker thema" />}
        />,
        <InstRij
          key="taal"
          icon={<Globe size={18} aria-hidden="true" />}
          label="Taal"
          onClick={noop}
          right={
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              Nederlands
              <ChevronRight size={16} aria-hidden="true" />
            </span>
          }
        />,
      ]}
    </GroupCard>
  );
}

export function Huishouden() {
  return (
    <GroupCard>
      {[
        <InstRij
          key="profiel"
          icon={<User size={18} aria-hidden="true" />}
          label="Mijn profiel"
          onClick={noop}
          right={<ChevronRight size={16} className="text-muted-foreground" aria-hidden="true" />}
        />,
        <InstRij
          key="leden"
          icon={<Users size={18} aria-hidden="true" />}
          label="Huisgenoten"
          onClick={noop}
          right={
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              Sanne, Tom
              <ChevronRight size={16} aria-hidden="true" />
            </span>
          }
        />,
      ]}
    </GroupCard>
  );
}
