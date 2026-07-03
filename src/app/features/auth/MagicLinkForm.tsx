import { useState } from "react";
import { motion } from "motion/react";
import { VeldInput } from "../../components/shared";

/** Passwordless e-mail-only form — sends a magic link, no account details needed upfront. */
export function MagicLinkForm({
  onSubmit, busy, submitLabel,
}: {
  onSubmit: (email: string) => void;
  busy: boolean;
  submitLabel: string;
}) {
  const [email, setEmail] = useState("");
  const canSubmit = Boolean(email.trim());

  function submit() {
    if (!canSubmit || busy) return;
    onSubmit(email.trim());
  }

  return (
    <div className="space-y-3">
      <VeldInput
        value={email} onChange={setEmail} placeholder="E-mailadres" type="email" ariaLabel="E-mailadres"
        name="email" autoComplete="email" inputMode="email" spellCheck={false}
        autoFocus onEnter={submit}
      />
      <motion.button
        whileTap={{ scale: 0.97 }} onClick={submit} disabled={!canSubmit || busy}
        aria-busy={busy}
        className="w-full py-4 rounded-2xl border border-border bg-card text-sm font-semibold text-foreground disabled:opacity-40 transition-opacity focus-ring focus-visible:ring-offset-2">
        {busy ? "Even geduld…" : submitLabel}
      </motion.button>
    </div>
  );
}
