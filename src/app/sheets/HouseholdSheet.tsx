import { useState } from "react";
import { motion } from "motion/react";
import { Check, Pencil, Copy, Share2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useCuraStore } from "../../stores/useCuraStore";
import { SAGE } from "../lib/constants";
import { spring } from "../lib/motion";
import { Sheet, SheetHeader, Kop, Avatar, GroupCard } from "../components/shared";

export function HouseholdSheet({ onClose }: { onClose: () => void }) {
  const household = useCuraStore((s) => s.households[0]);
  const members = useCuraStore((s) => s.members);
  const currentUserId = useCuraStore((s) => s.currentUserId);

  const [naam, setNaam] = useState(household?.name ?? "Thuis");
  const [editing, setEditing] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function genCode() {
    setCode(`CURA-${Math.random().toString(36).slice(2, 6).toUpperCase()}`);
  }
  function copy() {
    if (!code) return;
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopied(true);
    toast("Code gekopieerd!");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Sheet onClose={onClose} tall>
      <SheetHeader title="Huishouden" onClose={onClose} />
      <Kop>Naam</Kop>
      <div className="flex gap-2 mb-7">
        <input value={naam} onChange={(e) => setNaam(e.target.value)} disabled={!editing}
          className="flex-1 rounded-2xl px-4 py-3.5 text-foreground outline-none text-sm transition-all"
          style={{ background: editing ? "var(--secondary)" : "var(--muted)", boxShadow: editing ? `0 0 0 2px color-mix(in srgb, var(--primary) 26%, transparent)` : "none" }} />
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => { if (editing) toast("Naam opgeslagen — binnenkort"); setEditing(!editing); }}
          aria-label={editing ? "Naam opslaan" : "Naam bewerken"}
          className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--primary)_50%,transparent)]"
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
              {m.userId !== currentUserId && (
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => toast(`${m.displayName} verwijderen — binnenkort`)}
                  className="text-xs text-muted-foreground/70 px-2.5 py-1 rounded-full border border-border">
                  Verwijder
                </motion.button>
              )}
            </div>
          ))}
        </GroupCard>
      </div>

      <Kop>Uitnodigen</Kop>
      <p className="text-sm text-muted-foreground mb-5 leading-relaxed">Genereer een code en deel hem via WhatsApp. De uitgenodigde tikt op accepteren.</p>
      {!code
        ? <motion.button whileTap={{ scale: 0.97 }} onClick={genCode}
            className="w-full py-4 rounded-2xl text-white text-sm font-semibold flex items-center justify-center gap-2"
            style={{ background: "var(--gradient-primary)", boxShadow: `0 5px 18px color-mix(in srgb, var(--primary) 30%, transparent)` }}>
            <Sparkles size={15} /> Uitnodigingscode genereren
          </motion.button>
        : <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring}
            className="rounded-2xl p-5 space-y-4" style={{ background: "color-mix(in srgb, var(--primary) 7%, transparent)", border: `1px solid color-mix(in srgb, var(--primary) 17%, transparent)` }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Uitnodigingscode</p>
                <p className="text-2xl font-bold tracking-[0.15em]" style={{ fontFamily: "monospace", color: SAGE }}>{code}</p>
              </div>
              <motion.button whileTap={{ scale: 0.88 }} onClick={copy}
                aria-label={copied ? "Code gekopieerd" : "Code kopiëren"}
                aria-live="polite"
                animate={{ backgroundColor: copied ? SAGE : "color-mix(in srgb, var(--primary) 12%, transparent)" }}
                className="w-10 h-10 rounded-2xl flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--primary)_50%,transparent)]">
                {copied ? <Check size={15} className="text-white" aria-hidden="true" /> : <Copy size={15} style={{ color: SAGE }} aria-hidden="true" />}
              </motion.button>
            </div>
            <div className="flex gap-2">
              <motion.button whileTap={{ scale: 0.95 }} onClick={copy} className="flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5" style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)", color: SAGE }}><Copy size={12} /> Kopieer</motion.button>
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => toast("Gedeeld via WhatsApp (demo)")} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-1.5" style={{ background: "#25D366" }}><Share2 size={12} /> WhatsApp</motion.button>
            </div>
            <motion.button whileTap={{ scale: 0.95 }} onClick={genCode} className="w-full text-xs text-center text-muted-foreground">Nieuwe code genereren</motion.button>
          </motion.div>
      }
    </Sheet>
  );
}
