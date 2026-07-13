import { PageHeader, PillButton } from 'cura';
import { Plus } from 'lucide-react';

// Page title + subtitle + optional action, the top of every tab. Lora display
// title, warm muted subtitle; the action sits bottom-aligned on the right.
const noop = () => {};

export function Standaard() {
  return <PageHeader title="Vandaag" subtitle="Nog vier taken te gaan — je bent bijna klaar." />;
}

export function MetActie() {
  return (
    <PageHeader
      title="Taken"
      subtitle="Alles wat er deze week speelt in huis."
      action={
        <PillButton icon={<Plus size={15} aria-hidden="true" />} onClick={noop}>
          Nieuw
        </PillButton>
      }
    />
  );
}
