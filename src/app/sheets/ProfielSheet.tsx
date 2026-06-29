import { useState } from "react";
import { motion } from "motion/react";
import { Bell, ChevronRight, HelpCircle, Home, LogOut, Moon, Pencil, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useCuraStore } from "../../stores/useCuraStore";
import { SAGE } from "../lib/constants";
import { Sheet, Kop, Toggle, InstRij } from "../components/shared";

export function ProfielSheet({ onOpenHousehold, onClose }: { onOpenHousehold: () => void; onClose: () => void }) {
  const household = useCuraStore((s) => s.households[0]);
  const members = useCuraStore((s) => s.members);
  const currentUserId = useCuraStore((s) => s.currentUserId);
  const me = members.find((m) => m.userId === currentUserId);

  const [notif, setNotif] = useState(true);
  const [donker, setDonker] = useState(false);

  const naam = me?.displayName ?? "Jij";

  return (
    <Sheet onClose={onClose} tall>
      <div className="flex items-center gap-4 mb-7">
        <div className="w-16 h-16 rounded-[1.1rem] flex items-center justify-center flex-shrink-0"
          style={{ background: `linear-gradient(135deg,#6B9968,${SAGE})`, boxShadow: `0 6px 20px rgba(73,110,70,0.28)` }}>
          <span className="text-2xl font-medium text-white" style={{ fontFamily: "Lora,Georgia,serif" }}>{naam.charAt(0).toUpperCase()}</span>
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-medium text-foreground leading-tight" style={{ fontFamily: "Lora,Georgia,serif" }}>{naam}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">{household?.name ?? "Thuis"}</p>
        </div>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => toast("Profiel bewerken — binnenkort")}
          className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
          <Pencil size={13} className="text-muted-foreground" />
        </motion.button>
      </div>

      <div className="rounded-2xl px-5 py-4 mb-7" style={{ background: "rgba(184,207,175,0.2)", border: "1px solid rgba(184,207,175,0.36)" }}>
        <p className="text-sm leading-relaxed text-foreground/70" style={{ fontFamily: "Lora,Georgia,serif", fontStyle: "italic" }}>
          "Rustig en gestaag — dat is het ritme dat telt."
        </p>
      </div>

      <Kop>Huishouden</Kop>
      <motion.button whileTap={{ backgroundColor: "rgba(0,0,0,0.02)" }} onClick={onOpenHousehold}
        className="w-full flex items-center gap-3.5 bg-secondary rounded-2xl px-4 py-3.5 mb-7 transition-colors">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(73,110,70,0.12)" }}><Home size={16} style={{ color: SAGE }} /></div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-foreground">{household?.name ?? "Thuis"}</p>
          <p className="text-xs text-muted-foreground">{members.length} {members.length === 1 ? "lid" : "leden"}</p>
        </div>
        <ChevronRight size={15} className="text-muted-foreground" />
      </motion.button>

      <Kop>Instellingen</Kop>
      <div className="bg-secondary rounded-2xl overflow-hidden mb-7">
        <InstRij icon={<Bell size={15} />} label="Meldingen" right={<Toggle checked={notif} label="Meldingen" onChange={(v) => { setNotif(v); toast(v ? "Meldingen aan" : "Meldingen uit"); }} />} />
        <div className="h-px mx-4 bg-border" />
        <InstRij icon={<Moon size={15} />} label="Donkere modus" right={<Toggle checked={donker} label="Donkere modus" onChange={(v) => { setDonker(v); toast(v ? "Donker aan" : "Donker uit"); }} />} />
        <div className="h-px mx-4 bg-border" />
        <InstRij icon={<UserRound size={15} />} label="Account" right={<ChevronRight size={14} className="text-muted-foreground" />} onClick={() => toast("Account — binnenkort")} />
      </div>

      <Kop>Meer</Kop>
      <div className="bg-secondary rounded-2xl overflow-hidden">
        <InstRij icon={<HelpCircle size={15} />} label="Help & feedback" right={<ChevronRight size={14} className="text-muted-foreground" />} onClick={() => toast("Help — binnenkort")} />
        <div className="h-px mx-4 bg-border" />
        <InstRij icon={<LogOut size={15} style={{ color: "var(--destructive)" }} />}
          label={<span style={{ color: "var(--destructive)" }}>Uitloggen</span>} right={null}
          onClick={() => toast("Uitloggen?", { description: "Je kunt altijd terugkomen.", action: { label: "Uitloggen", onClick: () => toast("Tot de volgende keer.") } })} />
      </div>
      <p className="text-center text-xs text-muted-foreground mt-7">Cura · versie 0.1</p>
    </Sheet>
  );
}
