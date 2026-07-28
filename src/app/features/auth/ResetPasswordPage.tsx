import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../../auth/AuthProvider";
import { AppBackground } from "../../components/AppBackground";
import { LandingHeader } from "../../components/LandingHeader";
import { Logo } from "../../components/Logo";
import { Card, Kop, VeldInput, PrimaryButton } from "../../components/shared";

/** Matches WachtwoordSheet's own floor — Supabase surfaces its own error if the
 *  project raised the bar. */
const MIN_LENGTH = 8;

/** Shown by Gate while status === "passwordRecovery": the person followed a
 *  "wachtwoord vergeten" e-mail link and needs to choose a new password before
 *  Cura lets them any further in. Full-screen rather than a sheet since there's
 *  no shell/nav to open a sheet within at this point (mirrors AuthPage's own
 *  chrome instead). Submitting flips AuthProvider's status back to "signedIn"
 *  (see changePassword), so Gate moves on into the app on its own. */
export function ResetPasswordPage() {
  const { changePassword } = useAuth();
  const [wachtwoord, setWachtwoord] = useState("");
  const [herhaal, setHerhaal] = useState("");
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);

  const tooShort = wachtwoord.length > 0 && wachtwoord.length < MIN_LENGTH;
  const mismatch = herhaal.length > 0 && herhaal !== wachtwoord;
  const canSubmit = wachtwoord.length >= MIN_LENGTH && herhaal === wachtwoord;

  async function opslaan() {
    setTouched(true);
    if (!canSubmit || busy) return;
    setBusy(true);
    try {
      await changePassword(wachtwoord);
      toast("Wachtwoord ingesteld", { description: "Je bent weer ingelogd." });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Wachtwoord instellen lukte niet. Probeer het opnieuw.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="h-dvh overflow-y-auto flex flex-col items-center bg-background"
      style={{
        paddingBottom: "calc(2rem + var(--safe-bottom))",
        paddingLeft: "var(--safe-left)",
        paddingRight: "var(--safe-right)",
      }}
    >
      <AppBackground />
      <LandingHeader className="h-[36vh] min-h-[13rem] max-h-80 shrink-0 z-0" />

      <main className="w-full max-w-sm px-6 -mt-24 relative z-10 flex flex-col">
        <Card className="px-6 pt-7 pb-6">
          <div className="text-center mb-6">
            <Logo size={44} className="mx-auto mb-3 rounded-2xl shadow-sm" />
            <h1 className="text-[1.875rem] font-medium text-foreground leading-none font-display">Cura</h1>
            <p className="text-sm text-muted-foreground mt-2.5">Kies een nieuw wachtwoord.</p>
          </div>

          <Kop>Nieuw wachtwoord</Kop>
          <div className="mb-4 space-y-1.5">
            <VeldInput
              value={wachtwoord}
              onChange={setWachtwoord}
              placeholder="Nieuw wachtwoord"
              type="password"
              ariaLabel="Nieuw wachtwoord"
              name="new-password"
              autoComplete="new-password"
              invalid={touched && tooShort}
              autoFocus
            />
            {tooShort && (
              <p className="text-xs px-1" style={{ color: "var(--destructive)" }}>
                Minstens {MIN_LENGTH} tekens.
              </p>
            )}
          </div>

          <Kop>Herhaal wachtwoord</Kop>
          <div className="mb-7 space-y-1.5">
            <VeldInput
              value={herhaal}
              onChange={setHerhaal}
              placeholder="Herhaal wachtwoord"
              type="password"
              ariaLabel="Herhaal wachtwoord"
              name="confirm-password"
              autoComplete="new-password"
              invalid={mismatch}
              onEnter={opslaan}
            />
            {mismatch && (
              <p className="text-xs px-1" style={{ color: "var(--destructive)" }}>
                De wachtwoorden komen niet overeen.
              </p>
            )}
          </div>

          <PrimaryButton onClick={opslaan} disabled={!canSubmit} busy={busy}>
            {busy ? "Even geduld…" : "Wachtwoord instellen"}
          </PrimaryButton>
        </Card>
      </main>
    </div>
  );
}
