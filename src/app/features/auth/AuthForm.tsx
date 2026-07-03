import { useState } from "react";
import { PrimaryButton, VeldInput } from "../../components/shared";

export type AuthMode = "signin" | "signup";

/** Shared email/password(/displayName) form + submit button, used by AuthPage and AcceptInvitePage. */
export function AuthForm({
  mode, onSubmit, busy, submitLabel,
}: {
  mode: AuthMode;
  onSubmit: (fields: { email: string; password: string; displayName: string }) => void;
  busy: boolean;
  submitLabel: string;
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
      <PrimaryButton onClick={submit} disabled={!canSubmit} busy={busy}>
        {busy ? "Even geduld…" : submitLabel}
      </PrimaryButton>
    </div>
  );
}
