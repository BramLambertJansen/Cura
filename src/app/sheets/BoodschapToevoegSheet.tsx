import { useRef, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { Check, ChevronDown, ChevronRight, Minus, Plus, Tag } from "lucide-react";
import { useCuraStore } from "../../stores/useCuraStore";
import { IconBadge, PrimaryButton, Sheet, SheetHeader, fieldBorderColor, fieldBoxShadow } from "../components/shared";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
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

/**
 * Collapsed "current value + chevron" trigger that opens a Popover list of
 * options — the Eenheid/Categorie pickers. Replaces what used to be a
 * permanently open row of KeuzeChip pills for these two fields: with only
 * one value ever selected at a time, showing every option at once was more
 * chrome than the choice needed (unlike kamer/duur filters elsewhere, which
 * stay chip-rows because several can apply loosely at once).
 *
 * `variant="pill"` is the compact rounded-full trigger (Eenheid); `variant="row"`
 * is the wider field-style row with a leading icon badge (Categorie). Local to
 * this sheet, not `shared.tsx` — same precedent as ChecklistItemRij/TaakDraftRij
 * (CLAUDE.md §5 Status & checklist), so no design-system-page entry needed.
 */
function PickerField<T extends string>({
  variant, value, options, labels, onChange, icon, ariaLabel, contentWidth = "w-48",
}: {
  variant: "pill" | "row";
  value: T;
  options: readonly T[];
  labels: Record<T, string>;
  onChange: (v: T) => void;
  icon?: ReactNode;
  ariaLabel: string;
  contentWidth?: string;
}) {
  const [open, setOpen] = useState(false);
  const borderColor = open ? SAGE : "var(--border-input)";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {variant === "pill" ? (
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            aria-label={ariaLabel}
            className="w-full flex items-center justify-between gap-2 rounded-full px-4 py-3 text-[0.9375rem] text-foreground border transition-colors focus-ring"
            style={{ background: "var(--input-background)", borderColor, boxShadow: fieldBoxShadow({ active: open }) }}>
            <span className="truncate">{labels[value]}</span>
            <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ type: "spring", stiffness: 400, damping: 30 }} className="flex-shrink-0 text-muted-foreground" aria-hidden="true">
              <ChevronDown size={16} />
            </motion.span>
          </motion.button>
        ) : (
          <motion.button
            type="button"
            whileTap={{ scale: 0.99 }}
            aria-label={ariaLabel}
            className="w-full flex items-center gap-3 rounded-2xl px-3.5 py-3 text-left border transition-colors focus-ring"
            style={{ background: "var(--input-background)", borderColor, boxShadow: fieldBoxShadow({ active: open }) }}>
            {icon && <IconBadge icon={icon} size={34} />}
            <span className="flex-1 min-w-0 truncate text-[0.9375rem] text-foreground">{labels[value]}</span>
            <ChevronRight size={16} className="flex-shrink-0 text-muted-foreground" aria-hidden="true" />
          </motion.button>
        )}
      </PopoverTrigger>
      <PopoverContent className={`${contentWidth} p-1.5`} align="start">
        <div role="listbox" aria-label={ariaLabel} className="flex flex-col gap-0.5">
          {options.map((key) => {
            const selected = value === key;
            return (
              <button
                key={key}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => { onChange(key); setOpen(false); }}
                className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm text-left transition-colors focus-ring hover:bg-secondary/70"
                style={selected ? { background: "color-mix(in srgb, var(--primary) 10%, transparent)", color: SAGE, fontWeight: 600 } : { color: "var(--foreground)" }}>
                {labels[key]}
                {selected && <Check size={14} aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

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
