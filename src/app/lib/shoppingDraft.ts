import type { ShoppingUnitKey } from "../../data/types";

/**
 * Sensible starting amounts for the weight/volume units, so picking "gram"
 * seeds "500" instead of a blank field, and a quick-add of a free-unit product
 * lands a realistic amount ("500g kaas", "1l melk") rather than "1g".
 */
export const FREE_UNIT_DEFAULT: Record<Exclude<ShoppingUnitKey, "stuks">, number> = {
  g: 500,
  kg: 1,
  ml: 250,
  l: 1,
};

/**
 * Resolve the add-sheet's amount draft to a positive number, or `null` when it
 * isn't a usable amount yet. "stuks" uses the integer stepper; the weight/volume
 * units parse the free-text field (accepting an NL comma or a dot).
 */
export function parseDraftAmount(unit: ShoppingUnitKey, qty: number, qtyText: string): number | null {
  if (unit === "stuks") return qty > 0 ? qty : null;
  const n = parseFloat(qtyText.replace(",", "."));
  return Number.isNaN(n) || n <= 0 ? null : n;
}
