import { useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { useAuth } from "../../auth/AuthProvider";
import { AppBackground } from "../../components/AppBackground";
import { LandingHeader } from "../../components/LandingHeader";
import { AuthForm, type AuthMode } from "./AuthForm";
import { MagicLinkForm } from "./MagicLinkForm";

export function AuthPage() {
  const { signIn, signUp, signInWithMagicLink } = useAuth();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [busy, setBusy] = useState(false);
  const [magicBusy, setMagicBusy] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

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

  async function handleMagicLink(email: string) {
    setMagicBusy(true);
    try {
      await signInWithMagicLink(email);
      setMagicLinkSent(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Inloglink versturen lukte niet");
    } finally {
      setMagicBusy(false);
    }
  }

  return (
    <div
      className="min-h-dvh flex flex-col items-center bg-background"
      style={{
        paddingBottom: "calc(2rem + var(--safe-bottom))",
        paddingLeft: "var(--safe-left)",
        paddingRight: "var(--safe-right)",
      }}
    >
      <AppBackground />
      <LandingHeader subtitle={mode === "signin" ? "Welkom terug." : "Maak een account aan om te beginnen."} />
      <div
        className="w-full max-w-sm relative z-10 flex-1 flex flex-col justify-center"
        style={{
          paddingLeft: "1.5rem",
          paddingRight: "1.5rem",
        }}
      >
        {pendingConfirmation ? (
          <p role="status" aria-live="polite" className="text-center text-sm text-muted-foreground leading-relaxed">
            Check je e-mail om je account te bevestigen, log daarna hier in.
          </p>
        ) : magicLinkSent ? (
          <p role="status" aria-live="polite" className="text-center text-sm text-muted-foreground leading-relaxed">
            Check je e-mail voor een inloglink.
          </p>
        ) : (
          <div className="space-y-4">
            <MagicLinkForm onSubmit={handleMagicLink} busy={magicBusy} submitLabel="Stuur inloglink" />
            <div className="flex items-center gap-3 text-xs text-muted-foreground" role="presentation">
              <div className="h-px flex-1 bg-border" aria-hidden="true" />
              of, met wachtwoord
              <div className="h-px flex-1 bg-border" aria-hidden="true" />
            </div>
            <AuthForm
              mode={mode} busy={busy} onSubmit={handleSubmit}
              submitLabel={mode === "signin" ? "Inloggen" : "Account aanmaken"}
            />
          </div>
        )}
        {!magicLinkSent && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setPendingConfirmation(false); }}
            className="w-full text-center text-sm text-muted-foreground mt-6">
            {mode === "signin" ? "Nog geen account? Registreren" : "Al een account? Inloggen"}
          </motion.button>
        )}
      </div>
    </div>
  );
}
