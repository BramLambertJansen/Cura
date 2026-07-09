import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Bell, Check, ChevronRight, HelpCircle, Home, KeyRound, LogOut, Moon, Pencil, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../auth/AuthProvider";
import { useCuraStore } from "../../stores/useCuraStore";
import { useNotificationPreference } from "../lib/useTaskReminders";
import { usePushSubscription, isIOS } from "../lib/usePushSubscription";
import { resolveDataMode } from "../../data/store";
import { PRESS_TINT, SAGE } from "../lib/constants";
import { Sheet, Kop, Toggle, InstRij, Avatar, IconBadge, HintBanner, GroupCard } from "../components/shared";

export function ProfielSheet({ onOpenHousehold, onOpenWachtwoord, onClose }: { onOpenHousehold: () => void; onOpenWachtwoord: () => void; onClose: () => void }) {
  const { signOut, status, userId, email } = useAuth();
  const household = useCuraStore((s) => s.households[0]);
  const members = useCuraStore((s) => s.members);
  const currentUserId = useCuraStore((s) => s.currentUserId);
  const updateMember = useCuraStore((s) => s.updateMember);
  const updateQuietHours = useCuraStore((s) => s.updateQuietHours);
  const me = members.find((m) => m.userId === currentUserId);
  const quietEnabled = !!(me?.quietHoursStart && me?.quietHoursEnd);

  const { enabled: notif, toggle: toggleNotif } = useNotificationPreference();
  const { supported: pushSupported, standalone, subscribe, unsubscribe } = usePushSubscription();
  // iOS only delivers Web Push to a home-screen-installed PWA, never a Safari
  // tab — surface calm guidance instead of a toggle that can't fully work.
  const showIosInstallHint = isIOS() && !standalone;

  // Reconcile on open: if meldingen are already on, refresh this browser's push
  // subscription (idempotent upsert) so an expired/rotated one is healed. Reuses
  // the existing subscription, so it needs no permission prompt / user gesture.
  useEffect(() => {
    if (notif && pushSupported) void subscribe().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleNotifToggle() {
    const turningOff = notif;
    await toggleNotif(); // owns the permission prompt + local pref + its own toasts
    if (turningOff) {
      await unsubscribe().catch(() => {});
      return;
    }
    // Turning on: only subscribe once permission actually landed on "granted".
    const granted = typeof Notification !== "undefined" && Notification.permission === "granted";
    if (granted && pushSupported) {
      const ok = await subscribe().catch(() => false);
      if (!ok) {
        toast("Meldingen aan in deze app", {
          description: "Herinneringen als de app dicht is konden niet worden ingesteld — je krijgt ze wel terwijl Cura open is.",
        });
      }
    }
  }

  function handleQuietToggle() {
    void updateQuietHours(quietEnabled ? null : "22:00", quietEnabled ? null : "07:00");
  }

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
            <h3 className="text-xl font-medium text-foreground leading-tight font-display">{weergaveNaam}</h3>
          )}
          <p className="text-sm text-muted-foreground mt-0.5">{household?.name ?? "Thuis"}</p>
        </div>
        <motion.button whileTap={{ scale: 0.9 }} disabled={savingName}
          onClick={() => (editing ? saveName() : setEditing(true))}
          aria-label={editing ? "Naam opslaan" : "Naam bewerken"}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 focus-ring disabled:opacity-60"
          style={{ background: editing ? SAGE : "var(--secondary)" }}>
          {editing ? <Check size={14} className="text-white" aria-hidden="true" /> : <Pencil size={13} className="text-muted-foreground" aria-hidden="true" />}
        </motion.button>
      </div>

      <div className="mb-7">
        <HintBanner tone="muted">"Rustig en gestaag — dat is het ritme dat telt."</HintBanner>
      </div>

      <Kop>Huishouden</Kop>
      <motion.button whileTap={{ backgroundColor: PRESS_TINT }} onClick={onOpenHousehold}
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
          <InstRij icon={<Bell size={15} />} label="Meldingen" right={<Toggle checked={notif} label="Meldingen" onChange={() => { void handleNotifToggle(); }} />} />
          <InstRij icon={<Moon size={15} />} label="Stille uren" right={<Toggle checked={quietEnabled} label="Stille uren" onChange={handleQuietToggle} />} />
          <InstRij
            icon={<UserRound size={15} />}
            label={<span className="flex flex-col"><span>Account</span><span className="text-xs font-normal text-muted-foreground truncate max-w-[12rem]">{accountLabel}</span></span>}
            right={<ChevronRight size={14} className="text-muted-foreground" aria-hidden="true" />}
            onClick={showAccountInfo}
          />
          {dataMode !== "local" && (
            <InstRij
              icon={<KeyRound size={15} />}
              label="Wachtwoord"
              right={<ChevronRight size={14} className="text-muted-foreground" aria-hidden="true" />}
              onClick={onOpenWachtwoord}
            />
          )}
        </GroupCard>
        {quietEnabled && (
          <div className="mt-2.5 px-1 flex items-center gap-2.5 text-sm text-muted-foreground">
            <span>Geen meldingen van</span>
            <input type="time" value={me?.quietHoursStart ?? "22:00"}
              onChange={(e) => { void updateQuietHours(e.target.value, me?.quietHoursEnd ?? "07:00"); }}
              aria-label="Stille uren beginnen"
              className="rounded-xl px-2.5 py-1.5 border border-border text-foreground outline-none focus-ring"
              style={{ background: "var(--input-background)" }} />
            <span>tot</span>
            <input type="time" value={me?.quietHoursEnd ?? "07:00"}
              onChange={(e) => { void updateQuietHours(me?.quietHoursStart ?? "22:00", e.target.value); }}
              aria-label="Stille uren eindigen"
              className="rounded-xl px-2.5 py-1.5 border border-border text-foreground outline-none focus-ring"
              style={{ background: "var(--input-background)" }} />
          </div>
        )}
        {showIosInstallHint && (
          <p className="text-xs text-muted-foreground mt-2.5 px-1 leading-relaxed">
            Zet Cura op je beginscherm (Deel → "Zet op beginscherm") om ook meldingen te krijgen als de app dicht is.
          </p>
        )}
      </div>

      <Kop>Meer</Kop>
      <GroupCard>
        <InstRij icon={<HelpCircle size={15} />} label="Help & feedback" right={<ChevronRight size={14} className="text-muted-foreground" aria-hidden="true" />} onClick={openHelp} />
        <InstRij icon={<LogOut size={15} style={{ color: "var(--destructive)" }} />}
          label={<span style={{ color: "var(--destructive)" }}>Uitloggen</span>} right={null}
          onClick={() => toast("Uitloggen?", { description: "Je kunt altijd terugkomen.", action: { label: "Uitloggen", onClick: () => {
            void signOut()
              .then(() => toast("Tot de volgende keer."))
              .catch((e) => toast.error(e instanceof Error ? e.message : "Uitloggen lukte niet"));
          } } })} />
      </GroupCard>
      <p className="text-center text-xs text-muted-foreground mt-7">Cura · versie 0.1</p>
    </Sheet>
  );
}
