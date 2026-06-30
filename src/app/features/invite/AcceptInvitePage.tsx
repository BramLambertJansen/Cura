import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { useAuth } from "../../auth/AuthProvider";
import { useCuraStore } from "../../../stores/useCuraStore";
import { AuthForm, type AuthMode } from "../auth/AuthForm";

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
  const { status, signIn, signUp } = useAuth();
  const acceptInvite = useCuraStore((s) => s.acceptInvite);

  const [authMode, setAuthMode] = useState<AuthMode>("signup");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState(false);
  const attempted = useRef(false);

  useEffect(() => {
    if (status !== "signedIn" || !token || attempted.current) return;
    attempted.current = true;
    acceptInvite(token)
      .then((res) => {
        setResult(res);
        if (res.ok) setTimeout(() => navigate("/vandaag", { replace: true }), 1200);
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "Uitnodiging accepteren lukte niet");
        setResult({ ok: false, reason: "invalid" });
      });
  }, [status, token, acceptInvite, navigate]);

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

  if (!token) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-[2rem] font-medium text-foreground mb-2" style={{ fontFamily: "Lora,Georgia,serif" }}>Uitnodiging</h1>
          <p className="text-sm text-muted-foreground">Je bent uitgenodigd voor een huishouden in Cura.</p>
        </div>

        {status === "signedOut" && pendingConfirmation && (
          <p role="status" aria-live="polite" className="text-center text-sm text-muted-foreground leading-relaxed">
            Check je e-mail om je account te bevestigen, log daarna hier in om de uitnodiging te accepteren.
          </p>
        )}

        {status === "signedOut" && !pendingConfirmation && (
          <>
            <AuthForm
              mode={authMode} busy={busy} onSubmit={handleAuth}
              submitLabel={authMode === "signup" ? "Account aanmaken & accepteren" : "Inloggen & accepteren"}
            />
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
          <p role="status" aria-live="polite" className="text-center text-sm text-muted-foreground leading-relaxed">{REASON_COPY[result.reason]}</p>
        )}
        {result?.ok && <p role="status" aria-live="polite" className="text-center text-sm text-muted-foreground">Welkom! Je wordt doorgestuurd…</p>}
      </div>
    </div>
  );
}
