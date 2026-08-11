import { useRef, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { Minus, Plus, Tag } from "lucide-react";
import { useCuraStore } from "../../stores/useCuraStore";
import { PickerField, PrimaryButton, Sheet, SheetHeader, fieldBorderColor, fieldBoxShadow } from "../components/shared";
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
 * from the page's add-pill via SheetContext): title + aantal/eenheid +
 * categorie. Adding keeps the sheet open and refocuses, so several items go
 * in a row.
 */
export function BoodschapToevoegSheet(props: { onClose: () => void; headerExtra?: ReactNode; autoFocusTitle?: boolean }) {
  return (
    <Sheet onClose={props.onClose} tall>
      <BoodschapToevoegSheetBody {...props} />
    </Sheet>
  );
}

/**
 * Body-only variant, for a caller that owns the `Sheet` shell itself — see
 * AddTaskSheetBody for why the FAB's add-flow needs that.
 *
 * `autoFocusTitle` exists for that same shared shell: opening the sheet on this
 * form may focus the title field, but *switching* to it with the Taak/Boodschap
 * toggle must not — the sheet is already open and grabbing focus (plus the
 * keyboard) mid-flow reads as the field jumping at you.
 */
export function BoodschapToevoegSheetBody({ onClose, headerExtra, autoFocusTitle = true }: { onClose: () => void; headerExtra?: ReactNode; autoFocusTitle?: boolean }) {
  const createShoppingItem = useCuraStore((s) => s.createShoppingItem);

  // Add-view draft.
  const [title, setTitle] = useState("");
  const [titleActive, setTitleActive] = useState(false);
  const [qty, setQty] = useState(1);
  const [qtyText, setQtyText] = useState("");
  const [unit, setUnit] = useState<ShoppingUnitKey>("stuks");
  const [category, setCategory] = useState<ShoppingCategoryKey>("other");
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [descriptionActive, setDescriptionActive] = useState(false);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const justAddedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const amount = parseDraftAmount(unit, qty, qtyText);
  const canAdd = title.trim().length > 0 && amount !== null;

  function flashMessage(message: string) {
    setJustAdded(message);
    clearTimeout(justAddedTimer.current);
    justAddedTimer.current = setTimeout(() => setJustAdded(null), 1600);
  }

  function changeTitle(next: string) {
    setTitle(next);
    if (!categoryTouched) setCategory(next.trim() ? shoppingCategory(next) : "other");
  }

  function selectUnit(next: ShoppingUnitKey) {
    setUnit(next);
    // Only reset qtyText on an actual unit CHANGE — re-selecting the already
    // active unit shouldn't wipe what's typed. Switching between two non-stuks
    // units (e.g. g -> kg) must reset, not just fill-if-empty: the old number
    // is meaningless under the new unit's scale (500 "g" is not 500 "kg").
    if (next === unit) return;
    setQtyText(next === "stuks" ? "" : String(FREE_UNIT_DEFAULT[next]));
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
    setDescription("");
  }

  function handleAdd() {
    const name = title.trim();
    if (!name || amount === null) return;
    void createShoppingItem({ title: name, amount, unit, category, description: description.trim() || undefined });
    resetDraft();
    flashMessage(`${name} toegevoegd`);
    titleRef.current?.focus();
  }

  return (
    <>
      <SheetHeader title="Item toevoegen" onClose={onClose} />
      {headerExtra}

      <input
        ref={titleRef}
        autoFocus={autoFocusTitle}
        value={title}
        onChange={(e) => changeTitle(e.target.value)}
        onFocus={() => setTitleActive(true)}
        onBlur={() => setTitleActive(false)}
        onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
        placeholder="Bijv. melk of suiker"
        aria-label="Boodschap"
        className="w-full rounded-2xl px-4 py-3.5 text-foreground placeholder:text-muted-foreground outline-none text-[0.9375rem] border transition-all"
        style={fieldStyle(titleActive, !!title)}
      />

      <div className="mt-5">
        <p className="text-[0.68rem] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">Aantal &amp; eenheid</p>
        <div className="grid grid-cols-2 gap-3 items-center">
          {unit === "stuks" ? (
            <div
              className="flex w-full items-center justify-between gap-2.5 rounded-full p-1 border"
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
              className="w-full min-w-0 rounded-xl px-3 py-2.5 text-foreground placeholder:text-muted-foreground outline-none text-[0.9375rem] border transition-all"
              style={fieldStyle(false, !!qtyText)}
            />
          )}
          <div className="min-w-0">
            <PickerField variant="pill" value={unit} options={SHOPPING_UNIT_ORDER} labels={SHOPPING_UNIT_LABELS} onChange={selectUnit} ariaLabel="Eenheid kiezen" />
          </div>
        </div>
      </div>

      <div className="mt-5">
        <p className="text-[0.68rem] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">Categorie</p>
        <PickerField variant="row" value={category} options={SHOPPING_CATEGORY_ORDER} labels={SHOPPING_CATEGORY_LABELS} onChange={pickCategory} icon={<Tag size={15} aria-hidden="true" />} ariaLabel="Categorie kiezen" />
      </div>

      <div className="mt-5">
        <p className="text-[0.68rem] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
          Beschrijving <span className="normal-case font-medium opacity-70">(optioneel)</span>
        </p>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onFocus={() => setDescriptionActive(true)}
          onBlur={() => setDescriptionActive(false)}
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
          placeholder="Bijv. merk of smaak"
          aria-label="Beschrijving"
          className="w-full rounded-2xl px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none text-[0.9375rem] border transition-all"
          style={fieldStyle(descriptionActive, !!description)}
        />
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
              {justAdded}
            </motion.p>
          )}
        </div>
      </div>
    </>
  );
}
