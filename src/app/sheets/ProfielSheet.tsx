import { motion } from "motion/react";
import { Bell, ChevronRight, HelpCircle, Home, LogOut, Moon, Pencil, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../auth/AuthProvider";
import { useCuraStore } from "../../stores/useCuraStore";
import { useNotificationPreference } from "../lib/useTaskReminders";
import { Sheet, Kop, Toggle, InstRij, Avatar, IconBadge, HintBanner, GroupCard } from "../components/shared";

export function ProfielSheet({ onOpenHousehold, onClose }: { onOpenHousehold: () => void; onClose: () => void }) {
  const { signOut } = useAuth();
  const household = useCuraStore((s) => s.households[0]);
  const members = useCuraStore((s) => s.members);
  const currentUserId = useCuraStore((s) => s.currentUserId);
  const me = members.find((m) => m.userId === currentUserId);

  const { enabled: notif, toggle: toggleNotif } = useNotificationPreference();

  const naam = me?.displayName ?? "Jij";

  return (
    <Sheet onClose={onClose} tall>
      <div className="flex items-center gap-4 mb-7">
        <Avatar name={naam} size={64} tone="solid" shape="rounded" serif />
        <div className="flex-1">
          <h3 className="text-xl font-medium text-foreground leading-tight" style={{ fontFamily: "Lora,Georgia,serif" }}>{naam}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">{household?.name ?? "Thuis"}</p>
        </div>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => toast("Profiel bewerken — binnenkort")}
          aria-label="Profiel bewerken"
          className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--primary)_50%,transparent)]">
          <Pencil size={13} className="text-muted-foreground" aria-hidden="true" />
        </motion.button>
      </div>

      <div className="mb-7">
        <HintBanner tone="muted">"Rustig en gestaag — dat is het ritme dat telt."</HintBanner>
      </div>

      <Kop>Huishouden</Kop>
      <motion.button whileTap={{ backgroundColor: "rgba(0,0,0,0.02)" }} onClick={onOpenHousehold}
        className="w-full flex items-center gap-3.5 bg-secondary rounded-2xl px-4 py-3.5 mb-7 transition-colors">
        <IconBadge icon={<Home size={16} />} />
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-foreground">{household?.name ?? "Thuis"}</p>
          <p className="text-xs text-muted-foreground">{members.length} {members.length === 1 ? "lid" : "leden"}</p>
        </div>
        <ChevronRight size={15} className="text-muted-foreground" aria-hidden="true" />
      </motion.button>

      <Kop>Instellingen</Kop>
      <div className="mb-7">
        <GroupCard>
          <InstRij icon={<Bell size={15} />} label="Meldingen" right={<Toggle checked={notif} label="Meldingen" onChange={() => toggleNotif()} />} />
          <InstRij icon={<Moon size={15} />} label="Donkere modus" right={<ChevronRight size={14} className="text-muted-foreground" aria-hidden="true" />} onClick={() => toast("Donkere modus — binnenkort")} />
          <InstRij icon={<UserRound size={15} />} label="Account" right={<ChevronRight size={14} className="text-muted-foreground" aria-hidden="true" />} onClick={() => toast("Account — binnenkort")} />
        </GroupCard>
      </div>

      <Kop>Meer</Kop>
      <GroupCard>
        <InstRij icon={<HelpCircle size={15} />} label="Help & feedback" right={<ChevronRight size={14} className="text-muted-foreground" aria-hidden="true" />} onClick={() => toast("Help — binnenkort")} />
        <InstRij icon={<LogOut size={15} style={{ color: "var(--destructive)" }} />}
          label={<span style={{ color: "var(--destructive)" }}>Uitloggen</span>} right={null}
          onClick={() => toast("Uitloggen?", { description: "Je kunt altijd terugkomen.", action: { label: "Uitloggen", onClick: () => { signOut(); toast("Tot de volgende keer."); } } })} />
      </GroupCard>
      <p className="text-center text-xs text-muted-foreground mt-7">Cura · versie 0.1</p>
    </Sheet>
  );
}
