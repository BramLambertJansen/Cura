import { useEffect, useState } from "react";
import { SHOPPING_UNIT_ORDER } from "../../data/selectors";
import type { ShoppingUnitKey } from "../../data/types";

/** A "snel toevoegen" shortcut: a saved product with its usual unit + category,
 *  so a single tap adds a fully-specified item to the list. `categoryId` is
 *  optional and unvalidated beyond "is a string" — category ids are generated
 *  per household, so a static default can't hardcode one, and a category the
 *  user later deletes just leaves the shortcut without one (resolved back to
 *  "no category" by the render site, never treated as an error). */
export interface QuickShoppingItem {
  id: string;
  title: string;
  unit: ShoppingUnitKey;
  categoryId?: string;
}

const STORAGE_KEY = "cura:shopping:quick-items:v2";

/** First-run shortcuts. Once stored, the list is fully user-managed (any of
 *  these can be removed), so this seed only applies when nothing is saved yet.
 *  No categoryId — category ids are per-household, so a static seed can't
 *  point at a real one; the user categorizes a shortcut themselves if they want to. */
const DEFAULT_QUICK_ITEMS: QuickShoppingItem[] = [
  { id: "q-melk", title: "Melk", unit: "l" },
  { id: "q-brood", title: "Brood", unit: "stuks" },
  { id: "q-eieren", title: "Eieren", unit: "stuks" },
  { id: "q-kaas", title: "Kaas", unit: "g" },
  { id: "q-wcpapier", title: "Wc-papier", unit: "stuks" },
  { id: "q-groente", title: "Groente", unit: "kg" },
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
    (v.categoryId === undefined || typeof v.categoryId === "string")
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

  function addQuickItem(input: { title: string; unit: ShoppingUnitKey; categoryId?: string }) {
    const title = input.title.trim();
    if (!title) return;
    const normalized = normalizeTitle(title);
    setItems((cur) =>
      cur.some((x) => normalizeTitle(x.title) === normalized)
        ? cur
        : [...cur, { id: makeId(), title, unit: input.unit, categoryId: input.categoryId }],
    );
  }

  function removeQuickItem(id: string) {
    setItems((cur) => cur.filter((x) => x.id !== id));
  }

  return { items, addQuickItem, removeQuickItem };
}
