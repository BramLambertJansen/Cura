import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../auth/AuthProvider";
import { Sheet, SheetHeader, Kop, VeldInput, PrimaryButton } from "../components/shared";

/** Minimum matches Supabase's default password policy; the server surfaces its
 *  own error if the project raised the bar. */
const MIN_LENGTH = 8;

export function WachtwoordSheet({ onClose }: { onClose: () => void }) {
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
      toast("Wachtwoord gewijzigd", { description: "Je nieuwe wachtwoord is opgeslagen." });
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Wijzigen lukte niet. Probeer het opnieuw.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet onClose={onClose}>
      <SheetHeader title="Wachtwoord wijzigen" onClose={onClose} />
      <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
        Kies een nieuw wachtwoord van minstens {MIN_LENGTH} tekens. Je blijft ingelogd op dit apparaat.
      </p>

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
        {busy ? "Even geduld…" : "Wachtwoord opslaan"}
      </PrimaryButton>
    </Sheet>
  );
}
