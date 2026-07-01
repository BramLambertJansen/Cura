import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Bell, Check, ChevronRight, HelpCircle, Home, LogOut, Pencil, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../auth/AuthProvider";
import { useCuraStore } from "../../stores/useCuraStore";
import { useNotificationPreference } from "../lib/useTaskReminders";
import { resolveDataMode } from "../../data/store";
import { SAGE } from "../lib/constants";
import { Sheet, Kop, Toggle, InstRij, Avatar, IconBadge, HintBanner, GroupCard } from "../components/shared";

export function ProfielSheet({ onOpenHousehold, onClose }: { onOpenHousehold: () => void; onClose: () => void }) {
  const { signOut, status, userId, email } = useAuth();
  const household = useCuraStore((s) => s.households[0]);
  const members = useCuraStore((s) => s.members);
  const currentUserId = useCuraStore((s) => s.currentUserId);
  const updateMember = useCuraStore((s) => s.updateMember);
  const me = members.find((m) => m.userId === currentUserId);

  const { enabled: notif, toggle: toggleNotif } = useNotificationPreference();

  const [naam, setNaam] = useState(me?.displayName ?? "");
  // Guard: if the member hadn't resolved yet at mount, sync the name when it arrives.
  useEffect(() => {
    if (me?.displayName && !naam) setNaam(me.displayName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.displayName]);
  const [editing, setEditing] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const weergaveNaam = me?.displayName ?? "Jij";
  const dataMode = resolveDataMode();
  const accountLabel = dataMode === "local"
    ? "Lokaal profiel"
    : email ?? (status === "signedIn" ? "Ingelogd" : "Niet ingelogd");

  function showAccountInfo() {
    toast("Account", {
      description: dataMode === "local"
        ? "Je werkt lokaal op dit apparaat. Er is geen online account gekoppeld."
        : `${accountLabel} · ${household?.name ?? "Thuis"}`,
      action: dataMode !== "local" && userId
        ? { label: "Kopieer ID", onClick: () => { navigator.clipboard.writeText(userId).then(() => toast("Account-ID gekopieerd"), () => toast.error("Kopiëren lukte niet.")); } }
        : undefined,
    });
  }

  function openHelp() {
    const subject = encodeURIComponent("Feedback over Cura");
    const body = encodeURIComponent(`Hoi Cura,\n\nIk wil feedback delen over:\n\n- `);
    window.location.href = `mailto:feedback@cura.app?subject=${subject}&body=${body}`;
  }

  async function saveName() {
    const trimmed = naam.trim();
    if (!trimmed || trimmed === me?.displayName) {
      setEditing(false);
      return;
    }
    setSavingName(true);
    try {
      await updateMember(trimmed);
    } finally {
      setSavingName(false);
      setEditing(false);
    }
  }

  return (
    <Sheet onClose={onClose} tall>
      <div className="flex items-center gap-4 mb-7">
        <Avatar name={weergaveNaam} size={64} tone="solid" shape="rounded" serif />
        <div className="flex-1 min-w-0">
          {editing ? (
            <input value={naam} onChange={(e) => setNaam(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveName()}
              autoFocus
              aria-label="Naam"
              className="w-full rounded-2xl px-3.5 py-2.5 text-foreground outline-none text-base border border-border transition-all"
              style={{ background: "var(--input-background)", boxShadow: `var(--shadow-input), 0 0 0 2px color-mix(in srgb, var(--primary) 26%, transparent)` }} />
          ) : (
            <h3 className="text-xl font-medium text-foreground leading-tight" style={{ fontFamily: "Lora,Georgia,serif" }}>{weergaveNaam}</h3>
          )}
          <p className="text-sm text-muted-foreground mt-0.5">{household?.name ?? "Thuis"}</p>
        </div>
        <motion.button whileTap={{ scale: 0.9 }} disabled={savingName}
          onClick={() => (editing ? saveName() : setEditing(true))}
          aria-label={editing ? "Naam opslaan" : "Naam bewerken"}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--primary)_50%,transparent)] disabled:opacity-60"
          style={{ background: editing ? SAGE : "var(--secondary)" }}>
          {editing ? <Check size={14} className="text-white" aria-hidden="true" /> : <Pencil size={13} className="text-muted-foreground" aria-hidden="true" />}
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
          <InstRij
            icon={<UserRound size={15} />}
            label={<span className="flex flex-col"><span>Account</span><span className="text-xs font-normal text-muted-foreground truncate max-w-[12rem]">{accountLabel}</span></span>}
            right={<ChevronRight size={14} className="text-muted-foreground" aria-hidden="true" />}
            onClick={showAccountInfo}
          />
        </GroupCard>
      </div>

      <Kop>Meer</Kop>
      <GroupCard>
        <InstRij icon={<HelpCircle size={15} />} label="Help & feedback" right={<ChevronRight size={14} className="text-muted-foreground" aria-hidden="true" />} onClick={openHelp} />
        <InstRij icon={<LogOut size={15} style={{ color: "var(--destructive)" }} />}
          label={<span style={{ color: "var(--destructive)" }}>Uitloggen</span>} right={null}
          onClick={() => toast("Uitloggen?", { description: "Je kunt altijd terugkomen.", action: { label: "Uitloggen", onClick: () => { signOut(); toast("Tot de volgende keer."); } } })} />
      </GroupCard>
      <p className="text-center text-xs text-muted-foreground mt-7">Cura · versie 0.1</p>
    </Sheet>
  );
}
