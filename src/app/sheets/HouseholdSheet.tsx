import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Check, Pencil, Copy, Share2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useCuraStore } from "../../stores/useCuraStore";
import { resolveDataMode } from "../../data/store";
import { SAGE } from "../lib/constants";
import { spring } from "../lib/motion";
import { Sheet, SheetHeader, Kop, Avatar, GroupCard, PrimaryButton } from "../components/shared";

export function HouseholdSheet({ onClose }: { onClose: () => void }) {
  const household = useCuraStore((s) => s.households[0]);
  const members = useCuraStore((s) => s.members);
  const currentUserId = useCuraStore((s) => s.currentUserId);
  const createInvite = useCuraStore((s) => s.createInvite);
  const updateHousehold = useCuraStore((s) => s.updateHousehold);
  const revokeInvite = useCuraStore((s) => s.revokeInvite);

  const [naam, setNaam] = useState(household?.name ?? "");
  // Guard: if household hadn't resolved yet at mount, sync the name when it arrives.
  useEffect(() => {
    if (household?.name && !naam) setNaam(household.name);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [household?.name]);
  const [editing, setEditing] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const isLocal = resolveDataMode() === "local";
  const link = token ? `${window.location.origin}/uitnodiging/${token}` : null;

  async function saveName() {
    const trimmed = naam.trim();
    if (!trimmed || trimmed === household?.name) {
      setEditing(false);
      return;
    }
    setSavingName(true);
    try {
      await updateHousehold(trimmed);
    } finally {
      setSavingName(false);
      setEditing(false);
    }
  }
  async function genLink() {
    if (busy) return;
    setBusy(true);
    try {
      const invite = await createInvite();
      if (invite) setToken(invite.token);
    } finally {
      setBusy(false);
    }
  }
  async function revokeLink() {
    if (!token) return;
    await revokeInvite(token);
    setToken(null);
  }
  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast("Link gekopieerd!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Kopiëren lukte niet. Selecteer de link handmatig.");
    }
  }

  return (
    <Sheet onClose={onClose} tall>
      <SheetHeader title="Huishouden" onClose={onClose} />
      <Kop>Naam</Kop>
      <div className="flex gap-2 mb-7">
        <input value={naam} onChange={(e) => setNaam(e.target.value)} disabled={!editing}
          className={`flex-1 rounded-2xl px-4 py-3.5 text-foreground outline-none text-sm transition-all ${editing ? "border border-border" : ""}`}
          style={{ background: editing ? "var(--input-background)" : "var(--input-background-disabled)", boxShadow: editing ? `var(--shadow-input), 0 0 0 2px color-mix(in srgb, var(--primary) 26%, transparent)` : "none" }} />
        <motion.button whileTap={{ scale: 0.9 }} disabled={savingName}
          onClick={() => { if (editing) saveName(); else setEditing(true); }}
          aria-label={editing ? "Naam opslaan" : "Naam bewerken"}
          className="w-11 rounded-2xl flex items-center justify-center flex-shrink-0 self-stretch focus-ring disabled:opacity-60"
          style={{ background: editing ? SAGE : "var(--secondary)" }}>
          {editing ? <Check size={15} className="text-white" aria-hidden="true" /> : <Pencil size={13} className="text-muted-foreground" aria-hidden="true" />}
        </motion.button>
      </div>

      <Kop>Leden</Kop>
      <div className="mb-7">
        <GroupCard>
          {members.map((m) => (
            <div key={m.id} className="px-4 py-3.5 flex items-center gap-3">
              <Avatar name={m.displayName} size={40} tone={m.userId === currentUserId ? "softStrong" : "soft"} />
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{m.displayName}</p>
                <p className="text-xs text-muted-foreground">{m.userId === currentUserId ? "Jij" : "Huisgenoot"}</p>
              </div>
            </div>
          ))}
        </GroupCard>
      </div>

      <Kop>Uitnodigen</Kop>
      {isLocal ? (
        <p className="text-sm text-muted-foreground mb-5 leading-relaxed">Uitnodigen kan zodra je huishouden in de cloud staat.</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-5 leading-relaxed">Genereer een link en deel hem via WhatsApp. De uitgenodigde tikt op accepteren.</p>
          {!link
            ? <PrimaryButton onClick={genLink} busy={busy} icon={<Sparkles size={15} />}>
                {busy ? "Even geduld…" : "Uitnodigingslink genereren"}
              </PrimaryButton>
            : <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring}
                className="rounded-2xl p-5 space-y-4" style={{ background: "color-mix(in srgb, var(--primary) 7%, transparent)", border: `1px solid color-mix(in srgb, var(--primary) 17%, transparent)` }}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground mb-1">Uitnodigingslink</p>
                    <p className="text-sm font-medium truncate" style={{ color: SAGE }}>{link}</p>
                  </div>
                  <motion.button whileTap={{ scale: 0.88 }} onClick={copy}
                    aria-label={copied ? "Link gekopieerd" : "Link kopiëren"}
                    aria-live="polite"
                    animate={{ backgroundColor: copied ? SAGE : "color-mix(in srgb, var(--primary) 12%, transparent)" }}
                    className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 focus-ring">
                    {copied ? <Check size={15} className="text-white" aria-hidden="true" /> : <Copy size={15} style={{ color: SAGE }} aria-hidden="true" />}
                  </motion.button>
                </div>
                <div className="flex gap-2">
                  <motion.button whileTap={{ scale: 0.95 }} onClick={copy} className="flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5" style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)", color: SAGE }}><Copy size={12} /> Kopieer</motion.button>
                  <motion.button whileTap={{ scale: 0.95 }} onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(link)}`, "_blank")} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-1.5" style={{ background: "#25D366" }}><Share2 size={12} /> WhatsApp</motion.button>
                </div>
                <p className="text-xs text-center text-muted-foreground/80">Geldig tot 7 dagen na aanmaken, werkt één keer.</p>
                <div className="flex items-center justify-center gap-4">
                  <motion.button whileTap={{ scale: 0.95 }} onClick={genLink} disabled={busy} className="text-xs text-center text-muted-foreground">Nieuwe link genereren</motion.button>
                  <motion.button whileTap={{ scale: 0.95 }} onClick={revokeLink} className="text-xs text-center" style={{ color: "var(--destructive)" }}>Intrekken</motion.button>
                </div>
              </motion.div>
          }
        </>
      )}
    </Sheet>
  );
}
