import { useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { useAuth } from "../../auth/AuthProvider";
import { AuthForm, type AuthMode } from "./AuthForm";

export function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [busy, setBusy] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState(false);

  async function handleSubmit(fields: { email: string; password: string; displayName: string }) {
    setBusy(true);
    try {
      if (mode === "signup") {
        const { needsConfirmation } = await signUp(fields.email, fields.password, fields.displayName);
        if (needsConfirmation) setPendingConfirmation(true);
      } else {
        await signIn(fields.email, fields.password);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Inloggen lukte niet");
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
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="text-[2rem] font-medium text-foreground mb-2" style={{ fontFamily: "Lora,Georgia,serif" }}>Cura</h1>
          <p className="text-sm text-muted-foreground">
            {mode === "signin" ? "Welkom terug." : "Maak een account aan om te beginnen."}
          </p>
        </div>
        {pendingConfirmation ? (
          <p role="status" aria-live="polite" className="text-center text-sm text-muted-foreground leading-relaxed">
            Check je e-mail om je account te bevestigen, log daarna hier in.
          </p>
        ) : (
          <AuthForm
            mode={mode} busy={busy} onSubmit={handleSubmit}
            submitLabel={mode === "signin" ? "Inloggen" : "Account aanmaken"}
          />
        )}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setPendingConfirmation(false); }}
          className="w-full text-center text-sm text-muted-foreground mt-6">
          {mode === "signin" ? "Nog geen account? Registreren" : "Al een account? Inloggen"}
        </motion.button>
      </div>
    </div>
  );
}
