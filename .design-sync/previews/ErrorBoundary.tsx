import { ErrorBoundary } from 'cura';

// ErrorBoundary catches a render-time throw anywhere below it and shows a calm
// recovery screen ("Er ging iets mis" + a reassuring line + "Opnieuw laden")
// instead of a blank white crash. To exercise that path in a static card we
// mount a child that throws on render; the boundary then renders its fallback.
//
// The fallback is `fixed inset-0`, which would otherwise attach to the capture
// viewport and escape the grid cell (a blank card). A `transform` on the
// wrapper establishes a containing block, so the fixed layer resolves against
// this phone-sized frame instead and the whole recovery screen renders inside.
function Boom(): never {
  throw new Error('Kon de weekplanning niet laden');
}

export function Herstelscherm() {
  return (
    <div
      style={{
        position: 'relative',
        width: 380,
        height: 680,
        transform: 'translateZ(0)',
        overflow: 'hidden',
        borderRadius: 20,
        background: 'var(--background)',
      }}
    >
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    </div>
  );
}
