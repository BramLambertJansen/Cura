import { useState } from "react";
import { PrimaryButton, VeldInput } from "../../components/shared";

export type AuthMode = "signin" | "signup";

/** Shared email/password(/displayName) form + submit button, used by AuthPage and AcceptInvitePage. */
export function AuthForm({
  mode, onSubmit, busy, submitLabel, onForgotPassword,
}: {
  mode: AuthMode;
  onSubmit: (fields: { email: string; password: string; displayName: string }) => void;
  busy: boolean;
  submitLabel: string;
  /** Called with the form's current e-mail value when "Wachtwoord vergeten?" is
   *  tapped. Only rendered in signin mode; omit to hide the link entirely. */
  onForgotPassword?: (email: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  const canSubmit = Boolean(email.trim() && password.trim() && (mode === "signin" || displayName.trim()));

  function submit() {
    if (!canSubmit || busy) return;
    onSubmit({ email: email.trim(), password, displayName: displayName.trim() });
  }

  return (
    <div className="space-y-3">
      {mode === "signup" && (
        <VeldInput value={displayName} onChange={setDisplayName} placeholder="Je naam" ariaLabel="Je naam" name="name" autoComplete="name" autoFocus />
      )}
      <VeldInput
        value={email} onChange={setEmail} placeholder="E-mailadres" type="email" ariaLabel="E-mailadres"
        name="email" autoComplete="email" inputMode="email" spellCheck={false}
        autoFocus={mode === "signin"}
      />
      <VeldInput value={password} onChange={setPassword} placeholder="Wachtwoord" type="password" ariaLabel="Wachtwoord" name="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} onEnter={submit} />
      {mode === "signin" && onForgotPassword && (
        <button
          type="button"
          onClick={() => onForgotPassword(email.trim())}
          disabled={!email.trim()}
          className="block w-full text-right text-xs text-muted-foreground disabled:opacity-40 focus-ring rounded-lg py-0.5"
        >
          Wachtwoord vergeten?
        </button>
      )}
      <PrimaryButton onClick={submit} disabled={!canSubmit} busy={busy}>
        {busy ? "Even geduld…" : submitLabel}
      </PrimaryButton>
    </div>
  );
}
