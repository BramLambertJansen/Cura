import { useState } from "react";
import { motion } from "motion/react";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../auth/AuthProvider";
import { AppBackground } from "../../components/AppBackground";
import { LandingHeader } from "../../components/LandingHeader";
import { Logo } from "../../components/Logo";
import { Card } from "../../components/shared";
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

  const sent = pendingConfirmation || magicLinkSent;
  const subtitle = sent
    ? "Nog één stap."
    : mode === "signin"
      ? "Welkom terug."
      : "Maak een account aan om te beginnen.";

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
            <h1 className="text-[1.875rem] font-medium text-foreground leading-none font-display">
              Cura
            </h1>
            <p className="text-sm text-muted-foreground mt-2.5">{subtitle}</p>
          </div>

          {sent ? (
            <SentPanel
              message={
                pendingConfirmation
                  ? "We stuurden een bevestigingslink naar je inbox. Bevestig je account en log daarna hier in."
                  : "We stuurden een inloglink naar je inbox. Tik erop om verder te gaan."
              }
            />
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
        </Card>

        {sent ? (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => { setMagicLinkSent(false); setPendingConfirmation(false); }}
            className="w-full text-center text-sm text-muted-foreground mt-5 focus-ring rounded-lg py-1.5">
            Ander e-mailadres gebruiken
          </motion.button>
        ) : (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setPendingConfirmation(false); }}
            className="w-full text-center text-sm text-muted-foreground mt-5 focus-ring rounded-lg py-1.5">
            {mode === "signin" ? (
              <>Nog geen account? <span className="text-foreground font-medium">Registreren</span></>
            ) : (
              <>Al een account? <span className="text-foreground font-medium">Inloggen</span></>
            )}
          </motion.button>
        )}
      </main>
    </div>
  );
}

/** Calm "check your e-mail" confirmation, shown after a magic link or sign-up. */
function SentPanel({ message }: { message: string }) {
  return (
    <div className="text-center py-1" role="status" aria-live="polite">
      <div
        className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
        style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)", color: "var(--primary)" }}
        aria-hidden="true"
      >
        <Mail size={24} />
      </div>
      <h2 className="text-base font-medium text-foreground font-display mb-1.5">Check je e-mail</h2>
      <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>
    </div>
  );
}
