import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import { Check, ChevronRight, Pencil, Copy, Link2Off, Share2, Sparkles, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useCuraStore } from "../../stores/useCuraStore";
import { useCurrentMember } from "../../stores/useViews";
import { resolveDataMode } from "../../data/store";
import { toMcpTokenView } from "../../data/selectors";
import type { McpTokenView } from "../../data/types";
import { SAGE, PRESS_TINT } from "../lib/constants";
import { spring } from "../lib/motion";
import { Sheet, SheetHeader, Kop, Avatar, GroupCard, PrimaryButton, IconBadge, VeldInput, VerwijderKnop } from "../components/shared";

export function HouseholdSheet({ onClose, onOpenProfiel }: { onClose: () => void; onOpenProfiel?: () => void }) {
  const household = useCuraStore((s) => s.households[0]);
  const members = useCuraStore((s) => s.members);
  const currentUserId = useCuraStore((s) => s.currentUserId);
  const createInvite = useCuraStore((s) => s.createInvite);
  const updateHousehold = useCuraStore((s) => s.updateHousehold);
  const revokeInvite = useCuraStore((s) => s.revokeInvite);
  const listMcpTokens = useCuraStore((s) => s.listMcpTokens);
  const createMcpToken = useCuraStore((s) => s.createMcpToken);
  const revokeMcpToken = useCuraStore((s) => s.revokeMcpToken);
  const me = useCurrentMember();

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

  // Koppelingen (MCP-tokens, Phase 4 — CLAUDE.md §5 → AI-voorstellen). Not
  // part of useCuraStore's persisted state (admin-only, no realtime need) —
  // this sheet owns its own fetch, same as the invite token above.
  const [mcpTokens, setMcpTokens] = useState<McpTokenView[] | null>(null);
  const [tokenLabel, setTokenLabel] = useState("");
  const [creatingToken, setCreatingToken] = useState(false);
  const [freshToken, setFreshToken] = useState<{ id: string; label: string; rawToken: string } | null>(null);
  const [tokenCopied, setTokenCopied] = useState(false);

  const isLocal = resolveDataMode() === "local";
  const link = token ? `${window.location.origin}/uitnodiging/${token}` : null;

  const refreshMcpTokens = useCallback(async () => {
    const raw = await listMcpTokens();
    setMcpTokens(raw.map((t) => toMcpTokenView(t, members)));
  }, [listMcpTokens, members]);

  useEffect(() => {
    if (!isLocal) void refreshMcpTokens();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLocal]);

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

  async function genMcpToken() {
    const trimmed = tokenLabel.trim();
    if (!trimmed || creatingToken) return;
    setCreatingToken(true);
    try {
      const result = await createMcpToken(trimmed);
      if (result) {
        setFreshToken({ id: result.token.id, label: result.token.label, rawToken: result.rawToken });
        setTokenLabel("");
        await refreshMcpTokens();
      }
    } finally {
      setCreatingToken(false);
    }
  }

  async function copyMcpToken() {
    if (!freshToken) return;
    try {
      await navigator.clipboard.writeText(freshToken.rawToken);
      setTokenCopied(true);
      toast("Token gekopieerd!");
      setTimeout(() => setTokenCopied(false), 2000);
    } catch {
      toast.error("Kopiëren lukte niet. Selecteer het token handmatig.");
    }
  }

  async function revokeMcp(tokenId: string) {
    await revokeMcpToken(tokenId);
    if (freshToken?.id === tokenId) setFreshToken(null);
    await refreshMcpTokens();
  }

  return (
    <Sheet onClose={onClose} tall>
      <SheetHeader title="Huishouden" onClose={onClose} />
      {onOpenProfiel && (
        <motion.button whileTap={{ backgroundColor: PRESS_TINT }} onClick={onOpenProfiel}
          className="w-full flex items-center gap-3.5 bg-secondary rounded-2xl px-4 py-3.5 mb-7 transition-colors">
          <IconBadge icon={<UserRound size={16} />} />
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-foreground">Profiel</p>
            <p className="text-xs text-muted-foreground">{me?.displayName ?? "Jij"}</p>
          </div>
          <ChevronRight size={15} className="text-muted-foreground" aria-hidden="true" />
        </motion.button>
      )}
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
        <p className="text-sm text-muted-foreground mb-5 leading-relaxed">Uitnodigen werkt alleen met een online account. Nu staan je gegevens alleen op dit apparaat.</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-5 leading-relaxed">Maak een link en stuur die naar je huisgenoot. Wie erop tikt, logt in of maakt een account, en komt daarna in dit huishouden.</p>
          {!link
            ? <PrimaryButton onClick={genLink} busy={busy} icon={<Sparkles size={15} aria-hidden="true" />}>
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
                  <motion.button whileTap={{ scale: 0.95 }} onClick={copy} className="flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5" style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)", color: SAGE }}><Copy size={12} aria-hidden="true" /> Kopieer</motion.button>
                  <motion.button whileTap={{ scale: 0.95 }} onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(link)}`, "_blank")} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-1.5" style={{ background: "#25D366" }}><Share2 size={12} aria-hidden="true" /> WhatsApp</motion.button>
                </div>
                <p className="text-xs text-center text-muted-foreground">De link werkt 7 dagen en kan één keer worden gebruikt.</p>
                <div className="flex items-center justify-center gap-4">
                  <motion.button whileTap={{ scale: 0.95 }} onClick={genLink} disabled={busy} className="text-xs text-center text-muted-foreground">Nieuwe link genereren</motion.button>
                  <motion.button whileTap={{ scale: 0.95 }} onClick={revokeLink} className="text-xs text-center" style={{ color: "var(--destructive)" }}>Intrekken</motion.button>
                </div>
              </motion.div>
          }
        </>
      )}

      {/* Koppelingen — MCP-tokens voor een extern, "bring your own Claude"
          (Phase 4, CLAUDE.md §5 → AI-voorstellen). Leeft hier, naast
          Uitnodigen, niet op de AI-voorstellen-pagina zelf (die toont alleen
          de voorstellenlijst). Copy hieronder is een eerste versie — nog niet
          door Bram beoordeeld. */}
      <Kop>Koppelingen</Kop>
      {isLocal ? (
        <p className="text-sm text-muted-foreground leading-relaxed">Koppelingen werken alleen met een online account. Nu staan je gegevens alleen op dit apparaat.</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
            Koppel een eigen Claude aan dit huishouden (via MCP), zodat die taken kan voorstellen. Een voorstel wordt pas een taak nadat iemand het hier accepteert.
          </p>

          {freshToken ? (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring}
              className="rounded-2xl p-5 space-y-4 mb-5" style={{ background: "color-mix(in srgb, var(--primary) 7%, transparent)", border: `1px solid color-mix(in srgb, var(--primary) 17%, transparent)` }}>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Token voor "{freshToken.label}" — je ziet dit maar één keer</p>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium truncate" style={{ color: SAGE }}>{freshToken.rawToken}</p>
                  <motion.button whileTap={{ scale: 0.88 }} onClick={copyMcpToken}
                    aria-label={tokenCopied ? "Token gekopieerd" : "Token kopiëren"}
                    aria-live="polite"
                    animate={{ backgroundColor: tokenCopied ? SAGE : "color-mix(in srgb, var(--primary) 12%, transparent)" }}
                    className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 focus-ring">
                    {tokenCopied ? <Check size={15} className="text-white" aria-hidden="true" /> : <Copy size={15} style={{ color: SAGE }} aria-hidden="true" />}
                  </motion.button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">Plak dit token in de MCP-instellingen van je Claude. Sluit je dit scherm, dan is het niet meer op te vragen — herroep de koppeling en maak een nieuwe aan als je het kwijtraakt.</p>
              <button onClick={() => setFreshToken(null)} className="text-xs text-center text-muted-foreground w-full focus-ring rounded-lg py-1">Sluiten</button>
            </motion.div>
          ) : (
            <div className="flex gap-2 mb-5">
              <VeldInput value={tokenLabel} onChange={setTokenLabel} placeholder="Naam, bv. Bram's Claude" onEnter={genMcpToken} />
              <PrimaryButton onClick={genMcpToken} disabled={!tokenLabel.trim()} busy={creatingToken} fullWidth={false}>
                {creatingToken ? "Even geduld…" : "Koppel"}
              </PrimaryButton>
            </div>
          )}

          {(mcpTokens ?? []).filter((t) => !t.revoked).length > 0 && (
            <GroupCard>
              {(mcpTokens ?? []).filter((t) => !t.revoked).map((t) => (
                <div key={t.id} className="px-4 py-3.5">
                  <div className="mb-2">
                    <p className="text-sm font-semibold text-foreground truncate">{t.label}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      Aangemaakt door {t.createdBy} · {t.lastUsedAtLabel ? `laatst gebruikt ${t.lastUsedAtLabel}` : "nog niet gebruikt"}
                    </p>
                  </div>
                  <VerwijderKnop
                    label="Herroep koppeling"
                    ariaLabel={`${t.label} herroepen`}
                    confirmLabel="Ja, herroep"
                    icon={<Link2Off size={14} aria-hidden="true" />}
                    onConfirm={() => revokeMcp(t.id)}
                  />
                </div>
              ))}
            </GroupCard>
          )}
        </>
      )}
    </Sheet>
  );
}
