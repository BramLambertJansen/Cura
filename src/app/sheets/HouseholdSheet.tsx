import { useState } from "react";
import { motion } from "motion/react";
import { Check, Pencil, Copy, Share2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useCuraStore } from "../../stores/useCuraStore";
import { SAGE } from "../lib/constants";
import { spring } from "../lib/motion";
import { Sheet, SheetHeader, Kop } from "../components/shared";

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
          style={{ background: editing ? "var(--secondary)" : "var(--muted)", boxShadow: editing ? `0 0 0 2px rgba(73,110,70,0.26)` : "none" }} />
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => { if (editing) toast("Naam opgeslagen — binnenkort"); setEditing(!editing); }}
          aria-label={editing ? "Naam opslaan" : "Naam bewerken"}
          className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(73,110,70,0.5)]"
          style={{ background: editing ? SAGE : "var(--secondary)" }}>
          {editing ? <Check size={15} className="text-white" aria-hidden="true" /> : <Pencil size={13} className="text-muted-foreground" aria-hidden="true" />}
        </motion.button>
      </div>

      <Kop>Leden</Kop>
      <div className="rounded-2xl overflow-hidden mb-7" style={{ background: "var(--secondary)" }}>
        {members.map((m, i) => (
          <div key={m.id}>
            <div className="px-4 py-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm"
                style={{ background: m.userId === currentUserId ? "rgba(73,110,70,0.18)" : "rgba(184,207,175,0.45)", color: SAGE }}>
                {m.displayName.charAt(0).toUpperCase()}
              </div>
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
            {i < members.length - 1 && <div className="h-px mx-4" style={{ background: "var(--border)" }} />}
          </div>
        ))}
      </div>

      <Kop>Uitnodigen</Kop>
      <p className="text-sm text-muted-foreground mb-5 leading-relaxed">Genereer een code en deel hem via WhatsApp. De uitgenodigde tikt op accepteren.</p>
      {!code
        ? <motion.button whileTap={{ scale: 0.97 }} onClick={genCode}
            className="w-full py-4 rounded-2xl text-white text-sm font-semibold flex items-center justify-center gap-2"
            style={{ background: `linear-gradient(135deg,#5A8457 0%,${SAGE} 100%)`, boxShadow: `0 5px 18px rgba(73,110,70,0.3)` }}>
            <Sparkles size={15} /> Uitnodigingscode genereren
          </motion.button>
        : <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring}
            className="rounded-2xl p-5 space-y-4" style={{ background: "rgba(73,110,70,0.07)", border: `1px solid rgba(73,110,70,0.17)` }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Uitnodigingscode</p>
                <p className="text-2xl font-bold tracking-[0.15em]" style={{ fontFamily: "monospace", color: SAGE }}>{code}</p>
              </div>
              <motion.button whileTap={{ scale: 0.88 }} onClick={copy}
                aria-label={copied ? "Code gekopieerd" : "Code kopiëren"}
                aria-live="polite"
                animate={{ backgroundColor: copied ? SAGE : "rgba(73,110,70,0.12)" }}
                className="w-10 h-10 rounded-2xl flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(73,110,70,0.5)]">
                {copied ? <Check size={15} className="text-white" aria-hidden="true" /> : <Copy size={15} style={{ color: SAGE }} aria-hidden="true" />}
              </motion.button>
            </div>
            <div className="flex gap-2">
              <motion.button whileTap={{ scale: 0.95 }} onClick={copy} className="flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5" style={{ background: "rgba(73,110,70,0.1)", color: SAGE }}><Copy size={12} /> Kopieer</motion.button>
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => toast("Gedeeld via WhatsApp (demo)")} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-1.5" style={{ background: "#25D366" }}><Share2 size={12} /> WhatsApp</motion.button>
            </div>
            <motion.button whileTap={{ scale: 0.95 }} onClick={genCode} className="w-full text-xs text-center text-muted-foreground">Nieuwe code genereren</motion.button>
          </motion.div>
      }
    </Sheet>
  );
}
