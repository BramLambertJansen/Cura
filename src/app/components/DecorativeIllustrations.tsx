import type { ReactNode } from "react";
import { Coffee, Home, Leaf, Sofa, Sparkles, Sprout, Waves } from "lucide-react";
import { roomIcon } from "../lib/constants";

const ROOM_ACCENTS: Record<string, { tint: string; scene: ReactNode }> = {
  utensils: { tint: "#B8924A", scene: <KitchenScene /> },
  coffee: { tint: "#B8924A", scene: <KitchenScene /> },
  sofa: { tint: "#8B6EA8", scene: <LivingScene /> },
  tv: { tint: "#8B6EA8", scene: <LivingScene /> },
  droplets: { tint: "#5A8FA8", scene: <BathScene /> },
  bed: { tint: "#496E46", scene: <BedroomScene /> },
  shirt: { tint: "#6A8A88", scene: <LaundryScene /> },
  leaf: { tint: "#4E7A40", scene: <PlantScene /> },
  home: { tint: "#7A7068", scene: <HomeScene /> },
};

export function MorningScene() {
  return (
    <div className="relative h-24 overflow-hidden rounded-[1.75rem] border border-white/45 bg-[linear-gradient(180deg,#FFF6E8_0%,#F6E7CE_100%)] shadow-[var(--shadow-card)]" aria-hidden="true">
      <div className="absolute -left-10 bottom-0 h-16 w-44 rounded-[50%] bg-[#D7CEAA]/60" />
      <div className="absolute left-20 bottom-0 h-20 w-56 rounded-[50%] bg-[#E9DDBF]/70" />
      <div className="absolute right-8 top-10 h-9 w-9 rounded-full bg-[#E4A14F]/85 shadow-[0_0_26px_rgba(228,161,79,0.35)]" />
      <div className="absolute right-16 top-7 h-1 w-5 rounded-full bg-[#9C9A7E]/35" />
      <div className="absolute right-7 top-6 h-1 w-7 rounded-full bg-[#9C9A7E]/25" />
      <Leaf className="absolute left-5 top-5 text-primary/55" size={28} strokeWidth={1.6} />
      <p className="absolute left-6 top-11 max-w-36 text-[13px] font-semibold leading-snug text-foreground/80" style={{ fontFamily: "Lora,Georgia,serif" }}>Samen een zachte start</p>
    </div>
  );
}

export function TogetherScene() {
  return (
    <div className="relative h-28 overflow-hidden rounded-[1.75rem] border border-white/45 bg-[linear-gradient(135deg,#FFF9EF_0%,#EDE4CC_100%)] shadow-[var(--shadow-card)]" aria-hidden="true">
      <div className="absolute left-6 bottom-4 h-8 w-11 rounded-b-2xl rounded-t-md border-2 border-[#B8924A]/40 bg-[#E2B477]/35" />
      <div className="absolute left-16 bottom-5 h-5 w-7 rounded-full border-2 border-[#B8924A]/35" />
      <div className="absolute right-12 bottom-5 h-14 w-11 rounded-b-2xl rounded-t-md bg-[#A9B38E]/45" />
      <div className="absolute right-9 bottom-18 h-11 w-1 rounded-full bg-[#6F7D59]/45" />
      <Sprout className="absolute right-2 bottom-16 text-primary/55" size={54} strokeWidth={1.4} />
      <Sparkles className="absolute left-9 top-5 text-[#D8835D]/70" size={17} />
      <p className="absolute left-6 top-8 max-w-44 text-[13px] font-semibold leading-snug text-foreground/80" style={{ fontFamily: "Lora,Georgia,serif" }}>Wat we samen doen, maakt het lichter.</p>
    </div>
  );
}

export function EmptyStatePlant() {
  return (
    <div className="relative mx-auto h-20 w-24" aria-hidden="true">
      <div className="absolute bottom-0 left-1/2 h-9 w-12 -translate-x-1/2 rounded-b-2xl rounded-t-md bg-[#D9BC86]/55" />
      <Sprout className="absolute left-7 top-0 text-primary/70" size={48} strokeWidth={1.5} />
      <Leaf className="absolute left-11 top-2 rotate-12 text-accent" size={34} strokeWidth={1.5} />
    </div>
  );
}

export function RoomIllustration({ iconKey, className = "" }: { iconKey: string; className?: string }) {
  const fallback = roomIcon(iconKey);
  const visual = ROOM_ACCENTS[iconKey] ?? { tint: fallback.color, scene: <HomeScene /> };
  return (
    <div
      className={`relative h-16 w-24 flex-shrink-0 overflow-hidden rounded-2xl ${className}`}
      style={{ background: `linear-gradient(145deg, ${visual.tint}16, ${visual.tint}2D)` }}
      aria-hidden="true"
    >
      <div className="absolute inset-x-2 bottom-2 h-7 rounded-[50%] bg-white/28" />
      {visual.scene}
    </div>
  );
}

function KitchenScene() { return <><Coffee className="absolute left-4 bottom-4 text-[#9A6C3C]" size={26} strokeWidth={1.7} /><div className="absolute right-4 bottom-4 h-8 w-8 rounded-lg bg-[#D9BC86]/60" /></>; }
function LivingScene() { return <><Sofa className="absolute left-4 bottom-4 text-[#6F624F]" size={34} strokeWidth={1.55} /><Leaf className="absolute right-3 top-4 text-primary/50" size={22} /></>; }
function BathScene() { return <><Waves className="absolute left-3 bottom-4 text-[#5A8FA8]" size={34} strokeWidth={1.65} /><div className="absolute right-4 bottom-4 h-9 w-7 rounded-b-2xl bg-white/45" /></>; }
function BedroomScene() { return <><div className="absolute left-3 bottom-4 h-5 w-16 rounded-lg bg-[#D7CEAA]/70" /><div className="absolute left-3 bottom-8 h-5 w-8 rounded-t-lg bg-[#9BA987]/55" /></>; }
function LaundryScene() { return <><div className="absolute left-5 bottom-4 h-10 w-10 rounded-xl border-2 border-white/60 bg-white/30" /><div className="absolute left-8 bottom-7 h-4 w-4 rounded-full border-2 border-[#6A8A88]/55" /><Sparkles className="absolute right-4 top-4 text-[#D8835D]/65" size={16} /></>; }
function PlantScene() { return <><Sprout className="absolute left-5 bottom-3 text-primary/70" size={42} strokeWidth={1.5} /><Leaf className="absolute right-4 top-4 text-accent" size={24} /></>; }
function HomeScene() { return <><Home className="absolute left-4 bottom-4 text-[#7A7068]" size={34} strokeWidth={1.55} /><Leaf className="absolute right-4 top-4 text-primary/45" size={22} /></>; }
