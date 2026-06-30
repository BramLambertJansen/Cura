import { useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { useCuraStore } from "../../../stores/useCuraStore";
import { VeldInput } from "../../components/shared";

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
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-[2rem] font-medium text-foreground mb-2" style={{ fontFamily: "Lora,Georgia,serif" }}>Welkom</h1>
        <p className="text-sm text-muted-foreground mb-8">Geef je huishouden een naam om te beginnen.</p>
        <div className="space-y-3 text-left">
          <VeldInput value={naam} onChange={setNaam} placeholder="Bijv. Thuis" ariaLabel="Naam van je huishouden" autoFocus onEnter={submit} />
          <motion.button
            whileTap={{ scale: 0.97 }} onClick={submit} disabled={!naam.trim() || busy} aria-busy={busy}
            className="w-full py-4 rounded-2xl text-white text-sm font-semibold disabled:opacity-40 transition-opacity"
            style={{
              background: "var(--gradient-primary)",
              boxShadow: naam.trim() && !busy ? `0 5px 18px color-mix(in srgb, var(--primary) 30%, transparent)` : "none",
            }}>
            {busy ? "Even geduld…" : "Huishouden aanmaken"}
          </motion.button>
          <p role="status" aria-live="polite" className="sr-only">{busy ? "Huishouden wordt aangemaakt…" : ""}</p>
        </div>
      </div>
    </div>
  );
}
