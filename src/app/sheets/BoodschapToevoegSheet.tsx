import { useRef, useState } from "react";
import { motion } from "motion/react";
import { ChevronLeft, Minus, Plus, X } from "lucide-react";
import { useCuraStore } from "../../stores/useCuraStore";
import { IconButton, KeuzeChip, PrimaryButton, Sheet, SheetHeader, fieldBorderColor, fieldBoxShadow } from "../components/shared";
import { SAGE } from "../lib/constants";
import {
  SHOPPING_CATEGORY_LABELS,
  SHOPPING_CATEGORY_ORDER,
  SHOPPING_UNIT_LABELS,
  SHOPPING_UNIT_ORDER,
  shoppingCategory,
} from "../../data/selectors";
import type { ShoppingCategoryKey, ShoppingUnitKey } from "../../data/types";
import { FREE_UNIT_DEFAULT, parseDraftAmount } from "../lib/shoppingDraft";
import { useQuickShoppingItems, type QuickShoppingItem } from "../lib/useQuickShoppingItems";

/** Field-chrome for the bespoke title inputs (VeldInput has no ref for the
 *  refocus-after-add flow, so the sheet styles its own inputs the same way). */
function fieldStyle(active: boolean, hasValue: boolean) {
  return {
    background: "var(--input-background)",
    borderColor: fieldBorderColor({ active, hasValue }),
    boxShadow: fieldBoxShadow({ active }),
  } as const;
}

/**
 * Add-to-list bottom sheet for boodschappen (mounted in the app shell, opened
 * from the page's add-pill via SheetContext). Two views:
 *  - "toevoegen": title + snel-toevoegen shortcuts + aantal/eenheid + categorie.
 *    Adding keeps the sheet open and refocuses, so several items go in a row.
 *  - "beheren": manage the snel-toevoegen shortcuts (remove / add new).
 */
export function BoodschapToevoegSheet({ onClose }: { onClose: () => void }) {
  const createShoppingItem = useCuraStore((s) => s.createShoppingItem);
  const { items: quickItems, addQuickItem, removeQuickItem } = useQuickShoppingItems();

  const [manageOpen, setManageOpen] = useState(false);

  // Add-view draft.
  const [title, setTitle] = useState("");
  const [titleActive, setTitleActive] = useState(false);
  const [qty, setQty] = useState(1);
  const [qtyText, setQtyText] = useState("");
  const [unit, setUnit] = useState<ShoppingUnitKey>("stuks");
  const [category, setCategory] = useState<ShoppingCategoryKey>("other");
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const justAddedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Manage-view draft.
  const [mTitle, setMTitle] = useState("");
  const [mTitleActive, setMTitleActive] = useState(false);
  const [mUnit, setMUnit] = useState<ShoppingUnitKey>("stuks");
  const [mCategory, setMCategory] = useState<ShoppingCategoryKey>("other");

  const amount = parseDraftAmount(unit, qty, qtyText);
  const canAdd = title.trim().length > 0 && amount !== null;

  function flashAdded(name: string) {
    setJustAdded(name);
    clearTimeout(justAddedTimer.current);
    justAddedTimer.current = setTimeout(() => setJustAdded(null), 1600);
  }

  function changeTitle(next: string) {
    setTitle(next);
    if (!categoryTouched) setCategory(next.trim() ? shoppingCategory(next) : "other");
  }

  function selectUnit(next: ShoppingUnitKey) {
    setUnit(next);
    if (next !== "stuks") setQtyText((cur) => cur || String(FREE_UNIT_DEFAULT[next]));
  }

  function pickCategory(next: ShoppingCategoryKey) {
    setCategory(next);
    setCategoryTouched(true);
  }

  function resetDraft() {
    setTitle("");
    setQty(1);
    setQtyText("");
    setUnit("stuks");
    setCategory("other");
    setCategoryTouched(false);
  }

  function handleAdd() {
    const name = title.trim();
    if (!name || amount === null) return;
    void createShoppingItem({ title: name, amount, unit, category });
    resetDraft();
    flashAdded(name);
    titleRef.current?.focus();
  }

  function handleQuickAdd(q: QuickShoppingItem) {
    const amt = q.unit === "stuks" ? 1 : FREE_UNIT_DEFAULT[q.unit];
    void createShoppingItem({ title: q.title, amount: amt, unit: q.unit, category: q.category });
    flashAdded(q.title);
  }

  function handleAddShortcut() {
    const name = mTitle.trim();
    if (!name) return;
    addQuickItem({ title: name, unit: mUnit, category: mCategory });
    setMTitle("");
    setMUnit("stuks");
    setMCategory("other");
  }

  const showSuggestions = title.trim() === "" && quickItems.length > 0;

  return (
    <Sheet onClose={onClose} tall>
      {manageOpen ? (
        <>
          <div className="flex items-center gap-3 mb-6">
            <IconButton
              onClick={() => setManageOpen(false)}
              label="Terug"
              icon={<ChevronLeft size={16} className="text-foreground" aria-hidden="true" />}
            />
            <h3 id="sheet-title" className="text-xl font-medium text-foreground font-display">Snel toevoegen beheren</h3>
          </div>

          <div className="flex flex-col gap-2">
            {quickItems.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-4">Geen snelkoppelingen.</p>
            ) : (
              quickItems.map((q) => (
                <div key={q.id} className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3 border border-border/60">
                  <span className="flex-1 min-w-0 truncate text-[0.9375rem] font-medium text-foreground">{q.title}</span>
                  <span className="flex-shrink-0 text-xs text-muted-foreground">
                    {SHOPPING_CATEGORY_LABELS[q.category]} · {SHOPPING_UNIT_LABELS[q.unit]}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeQuickItem(q.id)}
                    aria-label={`${q.title} uit snelkeuzes halen`}
                    className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center focus-ring"
                    style={{ background: "color-mix(in srgb, var(--destructive) 12%, transparent)", color: "var(--destructive)" }}>
                    <X size={13} strokeWidth={2.6} aria-hidden="true" />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="mt-6 pt-5 border-t border-border/60 flex flex-col gap-3.5">
            <p className="text-[0.68rem] font-semibold uppercase tracking-wider text-muted-foreground">Nieuwe snelkoppeling</p>
            <input
              value={mTitle}
              onChange={(e) => setMTitle(e.target.value)}
              onFocus={() => setMTitleActive(true)}
              onBlur={() => setMTitleActive(false)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAddShortcut(); }}
              placeholder="Naam, bijv. Yoghurt"
              aria-label="Naam snelkoppeling"
              className="w-full rounded-2xl px-4 py-3 text-foreground placeholder:text-muted-foreground/70 outline-none text-[0.9375rem] border transition-all"
              style={fieldStyle(mTitleActive, !!mTitle)}
            />
            <div className="flex flex-wrap gap-2" aria-label="Eenheid kiezen">
              {SHOPPING_UNIT_ORDER.map((key) => (
                <KeuzeChip key={key} selected={mUnit === key} onClick={() => setMUnit(key)}>
                  {SHOPPING_UNIT_LABELS[key]}
                </KeuzeChip>
              ))}
            </div>
            <div className="flex flex-wrap gap-2" aria-label="Categorie kiezen">
              {SHOPPING_CATEGORY_ORDER.map((key) => (
                <KeuzeChip key={key} selected={mCategory === key} onClick={() => setMCategory(key)}>
                  {SHOPPING_CATEGORY_LABELS[key]}
                </KeuzeChip>
              ))}
            </div>
            <PrimaryButton
              onClick={handleAddShortcut}
              disabled={!mTitle.trim()}
              icon={<Plus size={16} aria-hidden="true" />}>
              Toevoegen aan snel toevoegen
            </PrimaryButton>
          </div>
        </>
      ) : (
        <>
          <SheetHeader title="Item toevoegen" onClose={onClose} />

          <input
            ref={titleRef}
            autoFocus
            value={title}
            onChange={(e) => changeTitle(e.target.value)}
            onFocus={() => setTitleActive(true)}
            onBlur={() => setTitleActive(false)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
            placeholder="Bijv. melk of suiker"
            aria-label="Boodschap"
            className="w-full rounded-2xl px-4 py-3.5 text-foreground placeholder:text-muted-foreground/70 outline-none text-[0.9375rem] border transition-all"
            style={fieldStyle(titleActive, !!title)}
          />

          {showSuggestions && (
            <div className="mt-5">
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-[0.68rem] font-semibold uppercase tracking-wider text-muted-foreground">Snel toevoegen</p>
                <button
                  type="button"
                  onClick={() => setManageOpen(true)}
                  className="text-xs font-semibold focus-ring rounded-md px-1 -mx-1"
                  style={{ color: SAGE }}>
                  Beheren
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {quickItems.map((q) => (
                  <motion.button
                    key={q.id}
                    type="button"
                    whileTap={{ scale: 0.93 }}
                    onClick={() => handleQuickAdd(q)}
                    className="rounded-full border border-border/60 bg-card px-3.5 py-2 text-[0.82rem] font-medium text-foreground focus-ring">
                    {q.title}
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-5 flex gap-4 items-start">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">Aantal</p>
              {unit === "stuks" ? (
                <div
                  className="inline-flex items-center gap-2.5 rounded-full p-1 border"
                  style={{ borderColor: "var(--border-input)", background: "var(--input-background)" }}>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.88 }}
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    aria-label="Minder"
                    className="w-8 h-8 rounded-full flex items-center justify-center bg-secondary text-foreground focus-ring">
                    <Minus size={15} aria-hidden="true" />
                  </motion.button>
                  <span className="min-w-[22px] text-center text-[0.95rem] font-semibold tabular-nums text-foreground">{qty}</span>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.88 }}
                    onClick={() => setQty((q) => Math.min(99, q + 1))}
                    aria-label="Meer"
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white focus-ring"
                    style={{ background: SAGE }}>
                    <Plus size={15} aria-hidden="true" />
                  </motion.button>
                </div>
              ) : (
                <input
                  value={qtyText}
                  onChange={(e) => { const v = e.target.value; if (/^[0-9]*[.,]?[0-9]*$/.test(v)) setQtyText(v); }}
                  inputMode="decimal"
                  placeholder={`bijv. ${FREE_UNIT_DEFAULT[unit]}`}
                  aria-label="Aantal"
                  className="w-28 rounded-xl px-3 py-2.5 text-foreground placeholder:text-muted-foreground/70 outline-none text-[0.9375rem] border transition-all"
                  style={fieldStyle(false, !!qtyText)}
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[0.68rem] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">Eenheid</p>
              <div className="flex flex-wrap gap-2" aria-label="Eenheid kiezen">
                {SHOPPING_UNIT_ORDER.map((key) => (
                  <KeuzeChip key={key} selected={unit === key} onClick={() => selectUnit(key)}>
                    {SHOPPING_UNIT_LABELS[key]}
                  </KeuzeChip>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5">
            <p className="text-[0.68rem] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">Categorie</p>
            <div className="flex flex-wrap gap-2" aria-label="Categorie kiezen">
              {SHOPPING_CATEGORY_ORDER.map((key) => (
                <KeuzeChip key={key} selected={category === key} onClick={() => pickCategory(key)}>
                  {SHOPPING_CATEGORY_LABELS[key]}
                </KeuzeChip>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <PrimaryButton onClick={handleAdd} disabled={!canAdd} icon={<Plus size={16} aria-hidden="true" />}>
              Toevoegen
            </PrimaryButton>
            <div className="h-5 mt-1.5 text-center" aria-live="polite">
              {justAdded && (
                <motion.p
                  initial={{ opacity: 0, y: -3 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs font-semibold"
                  style={{ color: SAGE }}>
                  {justAdded} toegevoegd
                </motion.p>
              )}
            </div>
          </div>
        </>
      )}
    </Sheet>
  );
}
