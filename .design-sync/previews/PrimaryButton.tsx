import { PrimaryButton } from 'cura';
import { LogIn, Send } from 'lucide-react';

// Full-width gradient CTA. Wrapped at a phone-ish width so it reads as the
// bottom-of-sheet action it is, not an infinitely-stretched bar.
const frame = { width: 320 } as const;

export function Default() {
  return <div style={frame}><PrimaryButton onClick={() => {}}>Opslaan</PrimaryButton></div>;
}

export function MetIcoon() {
  return (
    <div style={frame}>
      <PrimaryButton icon={<LogIn size={16} aria-hidden="true" />} onClick={() => {}}>
        Inloggen
      </PrimaryButton>
    </div>
  );
}

export function Bezig() {
  return <div style={frame}><PrimaryButton busy>Even geduld…</PrimaryButton></div>;
}

export function Uitgeschakeld() {
  return (
    <div style={frame}>
      <PrimaryButton disabled icon={<Send size={16} aria-hidden="true" />}>
        Verstuur uitnodiging
      </PrimaryButton>
    </div>
  );
}
