import { IconBadge } from 'cura';
import { Home, Bell, Settings, Sparkles } from 'lucide-react';

// Icon in a tinted rounded box — the lead visual on menu rows and link cards.
// `soft` tints sage; `muted` uses the quiet grey secondary fill. Shown in rows
// so both tints read at a glance.
const row = { display: 'flex', gap: 12, alignItems: 'center' } as const;

export function Zacht() {
  return (
    <div style={row}>
      <IconBadge tone="soft" icon={<Home size={18} aria-hidden="true" />} />
      <IconBadge tone="soft" icon={<Sparkles size={18} aria-hidden="true" />} />
      <IconBadge tone="soft" icon={<Bell size={18} aria-hidden="true" />} />
    </div>
  );
}

export function Gedempt() {
  return (
    <div style={row}>
      <IconBadge tone="muted" icon={<Settings size={18} aria-hidden="true" />} />
      <IconBadge tone="muted" icon={<Bell size={18} aria-hidden="true" />} />
    </div>
  );
}
