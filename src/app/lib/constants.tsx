import type { ReactNode } from "react";
import {
  UtensilsCrossed, Droplets, Sofa, BedDouble, Monitor, Leaf, Home, Tv,
  BookOpen, Shirt, Coffee, Wind, ShoppingBasket, Dumbbell, Baby, Sparkles,
  Toilet,
} from "lucide-react";

/** Reads a CSS custom property from :root so JS-side color constants stay tied to theme.css instead of duplicating its values. */
function cssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

/** Resolved theme colors. Framer Motion needs concrete colors (not var() strings) to animate between states, so these are read once from theme.css rather than hardcoded. */
export const SAGE = cssVar("--primary", "#496E46");
export const PRIMARY_FG = cssVar("--primary-foreground", "#ffffff");
export const MUTED_FG = cssVar("--muted-foreground", "#85786C");
export const DESTRUCTIVE = cssVar("--destructive", "#B04535");
export const SHADOW = "var(--shadow-card)";
export const SHADOW_LG = "var(--shadow-card-lg)";
/** The soft press-wash for whileTap on card-like rows — one constant instead of scattered rgba literals. */
export const PRESS_TINT = "rgba(0, 0, 0, 0.03)";

export interface IconOption {
  key: string;
  icon: ReactNode;
  iconLg: ReactNode;
  color: string;
  label: string;
  defaultName: string;
  /** Optional watercolor room illustration (public/rooms/*). When present, cards/detail render it instead of the line icon; falls back to `icon` when the file is missing so partial art degrades gracefully. */
  image?: string;
}

export const ICONS: IconOption[] = [
  { key: "utensils", icon: <UtensilsCrossed size={18} />, iconLg: <UtensilsCrossed size={40} />, color: "#B8924A", label: "Keuken", defaultName: "Keuken", image: "/rooms/keuken.png" },
  { key: "droplets", icon: <Droplets size={18} />, iconLg: <Droplets size={40} />, color: "#5A8FA8", label: "Badkamer", defaultName: "Badkamer", image: "/rooms/badkamer.png" },
  { key: "toilet", icon: <Toilet size={18} />, iconLg: <Toilet size={40} />, color: "#6E8A72", label: "Toilet", defaultName: "Toilet", image: "/rooms/toilet.png" },
  { key: "sofa", icon: <Sofa size={18} />, iconLg: <Sofa size={40} />, color: "#8B6EA8", label: "Woonkamer", defaultName: "Woonkamer", image: "/rooms/woonkamer.png" },
  { key: "bed", icon: <BedDouble size={18} />, iconLg: <BedDouble size={40} />, color: "#496E46", label: "Slaapkamer", defaultName: "Slaapkamer", image: "/rooms/slaapkamer.png" },
  { key: "monitor", icon: <Monitor size={18} />, iconLg: <Monitor size={40} />, color: "#7A6448", label: "Kantoor", defaultName: "Kantoor" },
  { key: "leaf", icon: <Leaf size={18} />, iconLg: <Leaf size={40} />, color: "#4E7A40", label: "Tuin", defaultName: "Tuin" },
  { key: "home", icon: <Home size={18} />, iconLg: <Home size={40} />, color: "#7A7068", label: "Hal", defaultName: "Hal" },
  { key: "tv", icon: <Tv size={18} />, iconLg: <Tv size={40} />, color: "#5A6A7A", label: "TV-kamer", defaultName: "TV-kamer" },
  { key: "book", icon: <BookOpen size={18} />, iconLg: <BookOpen size={40} />, color: "#7A5A48", label: "Studeerkamer", defaultName: "Studeerkamer" },
  { key: "shirt", icon: <Shirt size={18} />, iconLg: <Shirt size={40} />, color: "#8A6878", label: "Wasruimte", defaultName: "Wasruimte", image: "/rooms/wasruimte.png" },
  { key: "coffee", icon: <Coffee size={18} />, iconLg: <Coffee size={40} />, color: "#9A7A5A", label: "Eetkamer", defaultName: "Eetkamer" },
  { key: "wind", icon: <Wind size={18} />, iconLg: <Wind size={40} />, color: "#6A8A88", label: "Balkon", defaultName: "Balkon" },
  { key: "basket", icon: <ShoppingBasket size={18} />, iconLg: <ShoppingBasket size={40} />, color: "#8A7A4A", label: "Berging", defaultName: "Berging" },
  { key: "dumbbell", icon: <Dumbbell size={18} />, iconLg: <Dumbbell size={40} />, color: "#6A7A5A", label: "Fitnessruimte", defaultName: "Fitnessruimte" },
  { key: "baby", icon: <Baby size={18} />, iconLg: <Baby size={40} />, color: "#B88A8A", label: "Kinderkamer", defaultName: "Kinderkamer" },
  { key: "sparkles", icon: <Sparkles size={18} />, iconLg: <Sparkles size={40} />, color: "#9A8A6A", label: "Overig", defaultName: "Overig" },
];

export const ICON_BY_KEY: Record<string, IconOption> = Object.fromEntries(ICONS.map((i) => [i.key, i]));

export function roomIcon(iconKey: string): IconOption {
  return ICON_BY_KEY[iconKey] ?? ICONS[ICONS.length - 1];
}

export const TRIGGER_OPTIONS = [
  { id: "ochtend", label: "'s Ochtends" },
  { id: "middag", label: "'s Middags" },
  { id: "avond", label: "'s Avonds" },
  { id: "weekend", label: "Weekeinde" },
  { id: "dagelijks", label: "Dagelijks" },
  { id: "wekelijks", label: "Wekelijks" },
];

export const INTERVAL_PRESETS = [
  { days: 1, label: "Dagelijks" },
  { days: 2, label: "Om de dag" },
  { days: 3, label: "3 dagen" },
  { days: 7, label: "Wekelijks" },
  { days: 14, label: "2 weken" },
  { days: 30, label: "Maandelijks" },
];
