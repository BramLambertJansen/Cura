import { useState } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { useCuraStore } from "../../../stores/useCuraStore";
import { Logo } from "../../components/Logo";
import { AppBackground } from "../../components/AppBackground";
import { RoomThumb } from "../../components/RoomThumb";
import { ICONS } from "../../lib/constants";
import { PrimaryButton, VeldInput, OptieKaart } from "../../components/shared";

interface StarterTask {
  title: string;
  durationMin: number;
  dagdeel: "ochtend" | "middag" | "avond";
}

/**
 * A handful of generic, universally-applicable starter tasks — not tied to
 * any room the user just picked in the "kamers" step: STARTER_TASKS predate
 * that step and are meant to work whether or not a matching room exists, so
 * they stay unlinked rather than guessing a roomId from a title match. Two
 * are preselected so onboarding ends with real, visible content on Vandaag
 * instead of a completely empty app — the cold-start moment where new users
 * drop off.
 */
const STARTER_TASKS: StarterTask[] = [
  { title: "Afwas doen", durationMin: 10, dagdeel: "ochtend" },
  { title: "Prullenbak legen", durationMin: 5, dagdeel: "avond" },
  { title: "Stofzuigen", durationMin: 20, dagdeel: "middag" },
  { title: "Planten water geven", durationMin: 5, dagdeel: "ochtend" },
];
const PRESELECTED = [0, 1];

// Only the room types with a real watercolor illustration (public/rooms/*) —
// the same six KamerKunstKiezer leads with — so the picker never mixes art
// tiles with tinted line-icon fallbacks on this first-impression screen.
const STARTER_ROOMS = ICONS.slice(0, 6);
const PRESELECTED_ROOMS = new Set(["utensils", "droplets", "sofa", "bed"]);

/** "Create your first household" onboarding — for a signed-in user with zero households. */
export function CreateHouseholdPage() {
  const createHousehold = useCuraStore((s) => s.createHousehold);
  const createRoom = useCuraStore((s) => s.createRoom);
  const createTasksFromTemplates = useCuraStore((s) => s.createTasksFromTemplates);
  const [step, setStep] = useState<"naam" | "kamers" | "taken">("naam");
  const [naam, setNaam] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedRooms, setSelectedRooms] = useState<Set<string>>(() => new Set(PRESELECTED_ROOMS));
  const [selected, setSelected] = useState<Set<number>>(() => new Set(PRESELECTED));

  function toggle(i: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  }

  function toggleRoom(key: string) {
    setSelectedRooms((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  async function finish(indices: number[]) {
    if (busy) return;
    setBusy(true);
    try {
      await createHousehold(naam.trim());
      for (const key of selectedRooms) {
        const ic = STARTER_ROOMS.find((r) => r.key === key);
        if (ic) await createRoom({ name: ic.defaultName, iconKey: ic.key, color: ic.color });
      }
      if (indices.length > 0) {
        await createTasksFromTemplates(
          undefined,
          indices.map((i) => {
            const t = STARTER_TASKS[i];
            return { title: t.title, durationMin: t.durationMin, dagdeel: t.dagdeel, planned: true };
          }),
        );
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Aanmaken lukte niet");
      setBusy(false);
    }
  }

  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center bg-background"
      style={{
        paddingTop: "var(--safe-top)",
        paddingBottom: "var(--safe-bottom)",
        paddingLeft: "calc(1.5rem + var(--safe-left))",
        paddingRight: "calc(1.5rem + var(--safe-right))",
      }}
    >
      <AppBackground />
      <div className="w-full max-w-sm text-center relative z-10">
        <Logo size={56} className="mx-auto mb-4 rounded-xl" />
        {step === "naam" ? (
          <>
            <h1 className="text-[2rem] font-medium text-foreground mb-2 font-display">Welkom</h1>
            <p className="text-sm text-muted-foreground mb-8">Geef je huishouden een naam om te beginnen.</p>
            <div className="space-y-3 text-left">
              <VeldInput
                value={naam} onChange={setNaam} placeholder="Bijv. Thuis" ariaLabel="Naam van je huishouden" autoFocus
                onEnter={() => naam.trim() && setStep("kamers")}
              />
              <PrimaryButton onClick={() => setStep("kamers")} disabled={!naam.trim()}>Volgende</PrimaryButton>
              {/* An invited user shouldn't create a household here — that would strand
                  their invite (one huishouden per account). Point them at their link. */}
              <p className="text-xs text-muted-foreground leading-relaxed pt-2 text-center">
                Ben je uitgenodigd door iemand? Open dan de uitnodigingslink die je hebt gekregen — zo sluit je je bij hún huishouden aan.
              </p>
            </div>
          </>
        ) : step === "kamers" ? (
          <>
            <h1 className="text-[2rem] font-medium text-foreground mb-2 font-display">Welke kamers zijn er?</h1>
            <p className="text-sm text-muted-foreground mb-8">Optioneel — je kunt er later altijd meer toevoegen.</p>
            <div className="grid grid-cols-3 gap-2.5 mb-6" role="group" aria-label="Kamers selecteren">
              {STARTER_ROOMS.map((ic) => {
                const active = selectedRooms.has(ic.key);
                return (
                  <button
                    key={ic.key}
                    type="button"
                    onClick={() => toggleRoom(ic.key)}
                    aria-pressed={active}
                    aria-label={active ? `${ic.label} deselecteren` : `${ic.label} selecteren`}
                    className="flex flex-col items-center gap-1.5 rounded-2xl focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <div className="relative w-full aspect-square rounded-2xl overflow-hidden" style={{ boxShadow: "var(--shadow-input)" }}>
                      <RoomThumb ic={ic} color={ic.color} className="w-full h-full" rounded="rounded-2xl" large scaleImage={false} />
                      <div
                        className="absolute inset-0 rounded-2xl pointer-events-none"
                        style={{ boxShadow: active ? `inset 0 0 0 2.5px ${ic.color}` : `inset 0 0 0 0px ${ic.color}00` }}
                      />
                      {active && (
                        <span
                          className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center shadow-sm"
                          style={{ background: ic.color }}>
                          <Check size={12} strokeWidth={3} className="text-white" aria-hidden="true" />
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-medium text-center leading-tight" style={{ color: active ? ic.color : "var(--muted-foreground)" }}>{ic.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="space-y-2">
              <PrimaryButton onClick={() => setStep("taken")}>Volgende</PrimaryButton>
              <button
                type="button"
                onClick={() => { setSelectedRooms(new Set()); setStep("taken"); }}
                className="w-full py-2.5 text-center text-sm font-medium text-muted-foreground rounded-lg focus-ring"
              >
                Overslaan
              </button>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-[2rem] font-medium text-foreground mb-2 font-display">Alvast wat starttaken?</h1>
            <p className="text-sm text-muted-foreground mb-8">Optioneel — zet er een paar op je dag, of sla dit over.</p>
            <div className="space-y-2.5 text-left mb-4">
              {STARTER_TASKS.map((t, i) => {
                const active = selected.has(i);
                return (
                  <OptieKaart
                    key={t.title}
                    selected={active}
                    onClick={() => toggle(i)}
                    ariaLabel={active ? `${t.title} deselecteren` : `${t.title} selecteren`}
                    className="w-full flex items-center gap-3 px-4 py-3.5"
                  >
                    <span className="flex-1 text-left">
                      <span className="block text-sm font-medium text-foreground">{t.title}</span>
                      <span className="block text-xs text-muted-foreground mt-0.5">{t.durationMin} min</span>
                    </span>
                    {active && (
                      <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "var(--primary)" }}>
                        <Check size={11} strokeWidth={3} className="text-white" aria-hidden="true" />
                      </span>
                    )}
                  </OptieKaart>
                );
              })}
            </div>
            <div className="space-y-2">
              <PrimaryButton onClick={() => finish([...selected])} busy={busy}>
                {busy ? "Even geduld…" : "Aan de slag"}
              </PrimaryButton>
              <button
                type="button"
                onClick={() => finish([])}
                disabled={busy}
                className="w-full py-2.5 text-center text-sm font-medium text-muted-foreground rounded-lg focus-ring"
              >
                Overslaan
              </button>
            </div>
            <p role="status" aria-live="polite" className="sr-only">{busy ? "Huishouden wordt aangemaakt…" : ""}</p>
          </>
        )}
      </div>
    </div>
  );
}
