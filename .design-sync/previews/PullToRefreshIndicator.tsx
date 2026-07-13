import { PullToRefreshIndicator, Card } from 'cura';

// Mirrors PullState from src/app/lib/usePullToRefresh (not re-exported by the bundle).
type PullState = 'idle' | 'pulling' | 'refreshing';

// The calm water-drop that answers a pull-to-refresh: it fades and turns in
// with the pull, then breathes (the same soft fade as the skeletons) while the
// refresh runs — never a spinner. It positions itself `absolute top-0` against
// its nearest positioned ancestor, so we give it a relative, cream frame with a
// little page tucked behind it (pushed down, as if being pulled) for context.
function Frame({ pull, state }: { pull: number; state: PullState }) {
  return (
    <div
      style={{
        position: 'relative',
        width: 360,
        height: 220,
        background: 'var(--background)',
        borderRadius: 16,
        overflow: 'hidden',
      }}
    >
      <div style={{ paddingTop: 60, paddingLeft: 16, paddingRight: 16 }}>
        <Card>
          <p className="font-medium text-foreground font-display">Vandaag</p>
          <p className="text-sm text-muted-foreground mt-1">Even bijwerken…</p>
        </Card>
      </div>
      <PullToRefreshIndicator pull={pull} state={state} />
    </div>
  );
}

export function Verversen() {
  return <Frame pull={58} state="refreshing" />;
}

export function Trekken() {
  return <Frame pull={50} state="pulling" />;
}
