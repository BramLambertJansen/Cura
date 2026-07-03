import { useState } from "react";
import { toast } from "sonner";
import { useCuraStore } from "../../../stores/useCuraStore";
import { Logo } from "../../components/Logo";
import { AppBackground } from "../../components/AppBackground";
import { PrimaryButton, VeldInput } from "../../components/shared";

/** "Create your first household" onboarding — for a signed-in user with zero households. */
export function CreateHouseholdPage() {
  const createHousehold = useCuraStore((s) => s.createHousehold);
  const [naam, setNaam] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!naam.trim() || busy) return;
    setBusy(true);
    try {
      await createHousehold(naam.trim());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Aanmaken lukte niet");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center bg-background"
      style={{
        paddingTop: "var(--safe-top)",
        paddingBottom: "var(--safe-bottom)",
        paddingLeft: "calc(1.5rem + var(--safe-left))",
        paddingRight: "calc(1.5rem + var(--safe-right))",
      }}
    >
      <AppBackground />
      <div className="w-full max-w-sm text-center relative z-10">
        <Logo size={56} className="mx-auto mb-4 rounded-xl" />
        <h1 className="text-[2rem] font-medium text-foreground mb-2 font-display">Welkom</h1>
        <p className="text-sm text-muted-foreground mb-8">Geef je huishouden een naam om te beginnen.</p>
        <div className="space-y-3 text-left">
          <VeldInput value={naam} onChange={setNaam} placeholder="Bijv. Thuis" ariaLabel="Naam van je huishouden" autoFocus onEnter={submit} />
          <PrimaryButton onClick={submit} disabled={!naam.trim()} busy={busy}>
            {busy ? "Even geduld…" : "Huishouden aanmaken"}
          </PrimaryButton>
          <p role="status" aria-live="polite" className="sr-only">{busy ? "Huishouden wordt aangemaakt…" : ""}</p>
          {/* An invited user shouldn't create a household here — that would strand
              their invite (one huishouden per account). Point them at their link. */}
          <p className="text-xs text-muted-foreground leading-relaxed pt-2 text-center">
            Ben je uitgenodigd door iemand? Open dan de uitnodigingslink die je hebt gekregen — zo sluit je je bij hún huishouden aan.
          </p>
        </div>
      </div>
    </div>
  );
}
