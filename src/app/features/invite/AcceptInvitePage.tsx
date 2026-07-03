import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { useAuth } from "../../auth/AuthProvider";
import { useCuraStore } from "../../../stores/useCuraStore";
import { AppBackground } from "../../components/AppBackground";
import { PrimaryButton } from "../../components/shared";
import { AuthForm, type AuthMode } from "../auth/AuthForm";
import { MagicLinkForm } from "../auth/MagicLinkForm";

type Reason = "already_member" | "invalid" | "expired";
type Result = { ok: true } | { ok: false; reason: Reason };

const REASON_COPY: Record<Reason, string> = {
  already_member: "Je bent al lid van een huishouden. Cura ondersteunt op dit moment één huishouden per account.",
  invalid: "Deze uitnodiging is niet (meer) geldig.",
  expired: "Deze uitnodiging is verlopen. Vraag een nieuwe link aan.",
};

/** Reads the invite token from the URL, prompts auth inline (token stays in the URL), then accepts. */
export function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { status, signIn, signUp, signInWithMagicLink } = useAuth();
  const acceptInvite = useCuraStore((s) => s.acceptInvite);

  const [authMode, setAuthMode] = useState<AuthMode>("signup");
  const [busy, setBusy] = useState(false);
  const [magicBusy, setMagicBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const attempted = useRef(false);

  const runAccept = useCallback(() => {
    if (status !== "signedIn" || !token) return;
    setResult(null);
    acceptInvite(token)
      .then((res) => {
        setResult(res);
        if (res.ok) setTimeout(() => navigate("/vandaag", { replace: true }), 1200);
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "Uitnodiging accepteren lukte niet");
        // A network hiccup surfaces as "invalid" — the retry button below makes it recoverable.
        setResult({ ok: false, reason: "invalid" });
      });
  }, [status, token, acceptInvite, navigate]);

  useEffect(() => {
    if (status !== "signedIn" || !token || attempted.current) return;
    attempted.current = true;
    runAccept();
  }, [status, token, runAccept]);

  async function handleAuth(fields: { email: string; password: string; displayName: string }) {
    setBusy(true);
    try {
      if (authMode === "signup") {
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

  if (!token) return null;

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
      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-[2rem] font-medium text-foreground mb-2 font-display">Uitnodiging</h1>
          <p className="text-sm text-muted-foreground">Je bent uitgenodigd voor een huishouden in Cura.</p>
        </div>

        {status === "signedOut" && pendingConfirmation && (
          <p role="status" aria-live="polite" className="text-center text-sm text-muted-foreground leading-relaxed">
            Check je e-mail om je account te bevestigen, log daarna hier in om de uitnodiging te accepteren.
          </p>
        )}

        {status === "signedOut" && magicLinkSent && (
          <p role="status" aria-live="polite" className="text-center text-sm text-muted-foreground leading-relaxed">
            Check je e-mail voor een inloglink, dan word je vanzelf toegevoegd.
          </p>
        )}

        {status === "signedOut" && (pendingConfirmation || magicLinkSent) && (
          <button
            onClick={() => { setPendingConfirmation(false); setMagicLinkSent(false); }}
            className="w-full text-center text-sm text-muted-foreground mt-6 focus-ring rounded-lg py-1">
            Ander e-mailadres gebruiken
          </button>
        )}

        {status === "signedOut" && !pendingConfirmation && !magicLinkSent && (
          <>
            <div className="space-y-4">
              <MagicLinkForm onSubmit={handleMagicLink} busy={magicBusy} submitLabel="Stuur inloglink & accepteer" />
              <div className="flex items-center gap-3 text-xs text-muted-foreground" role="presentation">
                <div className="h-px flex-1 bg-border" aria-hidden="true" />
                of, met wachtwoord
                <div className="h-px flex-1 bg-border" aria-hidden="true" />
              </div>
              <AuthForm
                mode={authMode} busy={busy} onSubmit={handleAuth}
                submitLabel={authMode === "signup" ? "Account aanmaken & accepteren" : "Inloggen & accepteren"}
              />
            </div>
            <button
              onClick={() => setAuthMode(authMode === "signup" ? "signin" : "signup")}
              className="w-full text-center text-sm text-muted-foreground mt-6">
              {authMode === "signup" ? "Al een account? Inloggen" : "Nog geen account? Registreren"}
            </button>
          </>
        )}

        {(status === "loading" || (status === "signedIn" && !result)) && (
          <p role="status" aria-live="polite" className="text-center text-sm text-muted-foreground">Even geduld…</p>
        )}

        {result && !result.ok && (
          <div className="text-center space-y-4">
            <p role="status" aria-live="polite" className="text-sm text-muted-foreground leading-relaxed">{REASON_COPY[result.reason]}</p>
            <div className="space-y-3">
              {/* "invalid" is the only retryable state (it's also where a transient
                  network failure lands); already_member/expired are deterministic. */}
              {result.reason === "invalid" && (
                <PrimaryButton onClick={runAccept}>Opnieuw proberen</PrimaryButton>
              )}
              <button
                onClick={() => navigate("/vandaag", { replace: true })}
                className="w-full text-center text-sm text-muted-foreground focus-ring rounded-lg py-1">
                Naar Cura
              </button>
            </div>
          </div>
        )}
        {result?.ok && <p role="status" aria-live="polite" className="text-center text-sm text-muted-foreground">Welkom! Je wordt doorgestuurd…</p>}
      </div>
    </div>
  );
}
