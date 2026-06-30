import { useState } from "react";
import { motion } from "motion/react";
import { VeldInput } from "../../components/shared";

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
        <VeldInput value={displayName} onChange={setDisplayName} placeholder="Je naam" ariaLabel="Je naam" autoFocus />
      )}
      <VeldInput
        value={email} onChange={setEmail} placeholder="E-mailadres" type="email" ariaLabel="E-mailadres"
        autoFocus={mode === "signin"}
      />
      <VeldInput value={password} onChange={setPassword} placeholder="Wachtwoord" type="password" ariaLabel="Wachtwoord" onEnter={submit} />
      <motion.button
        whileTap={{ scale: 0.97 }} onClick={submit} disabled={!canSubmit || busy}
        className="w-full py-4 rounded-2xl text-white text-sm font-semibold disabled:opacity-40 transition-opacity"
        style={{
          background: "var(--gradient-primary)",
          boxShadow: canSubmit && !busy ? `0 5px 18px color-mix(in srgb, var(--primary) 30%, transparent)` : "none",
        }}>
        {busy ? "Even geduld…" : submitLabel}
      </motion.button>
    </div>
  );
}
