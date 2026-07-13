import { useEffect, useState } from "react";
import { SHOPPING_CATEGORY_ORDER, SHOPPING_UNIT_ORDER } from "../../data/selectors";
import type { ShoppingCategoryKey, ShoppingUnitKey } from "../../data/types";

/** A "snel toevoegen" shortcut: a saved product with its usual unit + category,
 *  so a single tap adds a fully-specified item to the list. */
export interface QuickShoppingItem {
  id: string;
  title: string;
  unit: ShoppingUnitKey;
  category: ShoppingCategoryKey;
}

const STORAGE_KEY = "cura:shopping:quick-items:v2";

/** First-run shortcuts. Once stored, the list is fully user-managed (any of
 *  these can be removed), so this seed only applies when nothing is saved yet. */
const DEFAULT_QUICK_ITEMS: QuickShoppingItem[] = [
  { id: "q-melk", title: "Melk", unit: "l", category: "cold" },
  { id: "q-brood", title: "Brood", unit: "stuks", category: "pantry" },
  { id: "q-eieren", title: "Eieren", unit: "stuks", category: "cold" },
  { id: "q-kaas", title: "Kaas", unit: "g", category: "cold" },
  { id: "q-wcpapier", title: "Wc-papier", unit: "stuks", category: "household" },
  { id: "q-groente", title: "Groente", unit: "kg", category: "fresh" },
];

const normalizeTitle = (title: string) => title.trim().toLocaleLowerCase("nl-NL");

function isQuickShoppingItem(value: unknown): value is QuickShoppingItem {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.title === "string" &&
    v.title.trim().length > 0 &&
    typeof v.unit === "string" &&
    SHOPPING_UNIT_ORDER.includes(v.unit as ShoppingUnitKey) &&
    typeof v.category === "string" &&
    SHOPPING_CATEGORY_ORDER.includes(v.category as ShoppingCategoryKey)
  );
}

function readQuickItems(): QuickShoppingItem[] {
  if (typeof localStorage === "undefined") return DEFAULT_QUICK_ITEMS;
  const raw = localStorage.getItem(STORAGE_KEY);
  // Absent key → first run: seed the defaults. A stored (possibly empty) list is
  // the user's own — respect it, including having removed everything.
  if (raw === null) return DEFAULT_QUICK_ITEMS;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isQuickShoppingItem) : DEFAULT_QUICK_ITEMS;
  } catch {
    return DEFAULT_QUICK_ITEMS;
  }
}

function makeId(): string {
  return "q" + Date.now().toString(36) + Math.random().toString(16).slice(2, 8);
}

/**
 * localStorage-backed "snel toevoegen" shortcuts for the boodschappen add sheet.
 * Shortcuts are convenience data, not household state, so they live per-device
 * in localStorage (like the old title-only list) rather than in the shared store.
 */
export function useQuickShoppingItems() {
  const [items, setItems] = useState<QuickShoppingItem[]>(() => readQuickItems());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Snelkeuzes zijn gemak, geen kritieke data.
    }
  }, [items]);

  function addQuickItem(input: { title: string; unit: ShoppingUnitKey; category: ShoppingCategoryKey }) {
    const title = input.title.trim();
    if (!title) return;
    const normalized = normalizeTitle(title);
    setItems((cur) =>
      cur.some((x) => normalizeTitle(x.title) === normalized)
        ? cur
        : [...cur, { id: makeId(), title, unit: input.unit, category: input.category }],
    );
  }

  function removeQuickItem(id: string) {
    setItems((cur) => cur.filter((x) => x.id !== id));
  }

  return { items, addQuickItem, removeQuickItem };
}
