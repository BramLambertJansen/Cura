import { PageSkeleton } from 'cura';

// A full page's worth of placeholder — title + subtitle bars over a short card
// list, mirroring PageHeader + a list (including the page's own px-5/pt-14
// offsets) so there's no jump once the real tab mounts. Wrapped in a cream,
// phone-width frame so it reads as a loading screen rather than loose bars.
const frame = {
  width: 360,
  background: 'var(--background)',
  borderRadius: 16,
  overflow: 'hidden',
} as const;

export function Pagina() {
  return <div style={frame}><PageSkeleton /></div>;
}
