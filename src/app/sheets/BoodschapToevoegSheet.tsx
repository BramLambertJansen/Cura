import { useRef, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { ArrowDown, ArrowUp, ChevronLeft, Minus, Plus, X } from "lucide-react";
import { useCuraStore } from "../../stores/useCuraStore";
import { IconButton, KeuzeChip, PrimaryButton, Sheet, SheetHeader, fieldBorderColor, fieldBoxShadow } from "../components/shared";
import { SAGE } from "../lib/constants";
import { SHOPPING_UNIT_LABELS, SHOPPING_UNIT_ORDER } from "../../data/selectors";
import type { ShoppingUnitKey } from "../../data/types";
import { FREE_UNIT_DEFAULT, parseDraftAmount } from "../lib/shoppingDraft";
import { useQuickShoppingItems, type QuickShoppingItem } from "../lib/useQuickShoppingItems";
import { EmptyIllustration } from "../components/EmptyIllustration";

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
 * from the page's add-pill via SheetContext). Three views:
 *  - "toevoegen": title + snel-toevoegen shortcuts + aantal/eenheid + categorie.
 *    Adding keeps the sheet open and refocuses, so several items go in a row.
 *  - "shortcuts": manage the snel-toevoegen shortcuts (remove / add new).
 *  - "categorieen": manage the household's shopping categories (rename via
 *    delete+re-add is NOT how this works — add / rename / delete / reorder,
 *    a household-shared entity, see useCuraStore's createCategory/
 *    updateCategory/deleteCategory).
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
  const shoppingItems = useCuraStore((s) => s.shoppingItems);
  const categories = useCuraStore((s) => s.categories);
  const createCategory = useCuraStore((s) => s.createCategory);
  const updateCategory = useCuraStore((s) => s.updateCategory);
  const deleteCategory = useCuraStore((s) => s.deleteCategory);
  const { items: quickItems, addQuickItem, removeQuickItem } = useQuickShoppingItems();
  const sortedCategories = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);

  const [manageOpen, setManageOpen] = useState<false | "shortcuts" | "categorieen">(false);

  // Add-view draft.
  const [title, setTitle] = useState("");
  const [titleActive, setTitleActive] = useState(false);
  const [qty, setQty] = useState(1);
  const [qtyText, setQtyText] = useState("");
  const [unit, setUnit] = useState<ShoppingUnitKey>("stuks");
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [description, setDescription] = useState("");
  const [descriptionActive, setDescriptionActive] = useState(false);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const justAddedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Shortcut-manage-view draft.
  const [mTitle, setMTitle] = useState("");
  const [mTitleActive, setMTitleActive] = useState(false);
  const [mUnit, setMUnit] = useState<ShoppingUnitKey>("stuks");
  const [mCategoryId, setMCategoryId] = useState<string | undefined>(undefined);

  // Category-manage-view draft.
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryActive, setNewCategoryActive] = useState(false);

  const amount = parseDraftAmount(unit, qty, qtyText);
  const canAdd = title.trim().length > 0 && amount !== null;

  function flashMessage(message: string) {
    setJustAdded(message);
    clearTimeout(justAddedTimer.current);
    justAddedTimer.current = setTimeout(() => setJustAdded(null), 1600);
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

  function resetDraft() {
    setTitle("");
    setQty(1);
    setQtyText("");
    setUnit("stuks");
    setCategoryId(undefined);
    setDescription("");
  }

  function handleAdd() {
    const name = title.trim();
    if (!name || amount === null) return;
    void createShoppingItem({ title: name, amount, unit, categoryId, description: description.trim() || undefined });
    resetDraft();
    flashMessage(`${name} toegevoegd`);
    titleRef.current?.focus();
  }

  function handleQuickAdd(q: QuickShoppingItem) {
    // A shortcut is meant for something you buy often — tapping it again once
    // it's already open or checked on the list would silently duplicate it.
    const alreadyOnList = shoppingItems.some((i) => i.title.trim().toLowerCase() === q.title.trim().toLowerCase());
    if (alreadyOnList) {
      flashMessage(`${q.title} staat al op de lijst`);
      return;
    }
    const amt = q.unit === "stuks" ? 1 : FREE_UNIT_DEFAULT[q.unit];
    void createShoppingItem({ title: q.title, amount: amt, unit: q.unit, categoryId: q.categoryId });
    flashMessage(`${q.title} toegevoegd`);
  }

  function handleAddShortcut() {
    const name = mTitle.trim();
    if (!name) return;
    addQuickItem({ title: name, unit: mUnit, categoryId: mCategoryId });
    setMTitle("");
    setMUnit("stuks");
    setMCategoryId(undefined);
  }

  function handleAddCategory() {
    const name = newCategoryName.trim();
    if (!name) return;
    const nextSortOrder = categories.reduce((max, c) => Math.max(max, c.sortOrder), -1) + 1;
    void createCategory({ name, sortOrder: nextSortOrder });
    setNewCategoryName("");
  }

  function moveCategory(index: number, direction: -1 | 1) {
    const other = sortedCategories[index + direction];
    const current = sortedCategories[index];
    if (!other) return;
    void updateCategory(current.id, { sortOrder: other.sortOrder });
    void updateCategory(other.id, { sortOrder: current.sortOrder });
  }

  // "Beheren" must stay reachable even with zero shortcuts — it's the only
  // entry point into managing them, so gating the whole block on
  // quickItems.length > 0 would permanently lock it once the list is empty.
  const showSuggestionsSection = title.trim() === "";

  if (manageOpen === "shortcuts") {
    return (
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
            <div className="py-2 text-center">
              <EmptyIllustration src="/states/empty-shortcuts.webp" className="!w-20 !h-20" />
              <p className="text-sm text-muted-foreground">Geen snelkoppelingen.</p>
            </div>
          ) : (
            quickItems.map((q) => {
              const categoryName = categories.find((c) => c.id === q.categoryId)?.name;
              return (
                <div key={q.id} className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3 border border-border/60">
                  <span className="flex-1 min-w-0 truncate text-[0.9375rem] font-medium text-foreground">{q.title}</span>
                  <span className="flex-shrink-0 text-xs text-muted-foreground">
                    {categoryName ? `${categoryName} · ` : ""}{SHOPPING_UNIT_LABELS[q.unit]}
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
              );
            })
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
            className="w-full rounded-2xl px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none text-[0.9375rem] border transition-all"
            style={fieldStyle(mTitleActive, !!mTitle)}
          />
          <div role="group" className="flex flex-wrap gap-2" aria-label="Eenheid kiezen">
            {SHOPPING_UNIT_ORDER.map((key) => (
              <KeuzeChip key={key} selected={mUnit === key} onClick={() => setMUnit(key)}>
                {SHOPPING_UNIT_LABELS[key]}
              </KeuzeChip>
            ))}
          </div>
          {sortedCategories.length > 0 && (
            <div role="group" className="flex flex-wrap gap-2" aria-label="Categorie kiezen">
              {sortedCategories.map((c) => (
                <KeuzeChip key={c.id} selected={mCategoryId === c.id} onClick={() => setMCategoryId(c.id)}>
                  {c.name}
                </KeuzeChip>
              ))}
            </div>
          )}
          <PrimaryButton
            onClick={handleAddShortcut}
            disabled={!mTitle.trim()}
            icon={<Plus size={16} aria-hidden="true" />}>
            Toevoegen aan snel toevoegen
          </PrimaryButton>
        </div>
      </>
    );
  }

  if (manageOpen === "categorieen") {
    return (
      <>
        <div className="flex items-center gap-3 mb-6">
          <IconButton
            onClick={() => setManageOpen(false)}
            label="Terug"
            icon={<ChevronLeft size={16} className="text-foreground" aria-hidden="true" />}
          />
          <h3 id="sheet-title" className="text-xl font-medium text-foreground font-display">Categorieën beheren</h3>
        </div>

        <div className="flex flex-col gap-2">
          {sortedCategories.length === 0 ? (
            <p className="py-2 text-center text-sm text-muted-foreground">Nog geen categorieën.</p>
          ) : (
            sortedCategories.map((c, index) => (
              <div key={c.id} className="flex items-center gap-2 rounded-2xl bg-card px-4 py-2.5 border border-border/60">
                <span className="flex-1 min-w-0 truncate text-[0.9375rem] font-medium text-foreground">{c.name}</span>
                <button
                  type="button"
                  onClick={() => moveCategory(index, -1)}
                  disabled={index === 0}
                  aria-label={`${c.name} naar boven`}
                  className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-secondary text-foreground focus-ring disabled:opacity-30">
                  <ArrowUp size={13} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => moveCategory(index, 1)}
                  disabled={index === sortedCategories.length - 1}
                  aria-label={`${c.name} naar beneden`}
                  className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-secondary text-foreground focus-ring disabled:opacity-30">
                  <ArrowDown size={13} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => void deleteCategory(c.id)}
                  aria-label={`${c.name} verwijderen`}
                  className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center focus-ring"
                  style={{ background: "color-mix(in srgb, var(--destructive) 12%, transparent)", color: "var(--destructive)" }}>
                  <X size={13} strokeWidth={2.6} aria-hidden="true" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="mt-6 pt-5 border-t border-border/60 flex flex-col gap-3.5">
          <p className="text-[0.68rem] font-semibold uppercase tracking-wider text-muted-foreground">Nieuwe categorie</p>
          <input
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onFocus={() => setNewCategoryActive(true)}
            onBlur={() => setNewCategoryActive(false)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAddCategory(); }}
            placeholder="Naam, bijv. Diepvries"
            aria-label="Naam categorie"
            className="w-full rounded-2xl px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none text-[0.9375rem] border transition-all"
            style={fieldStyle(newCategoryActive, !!newCategoryName)}
          />
          <PrimaryButton
            onClick={handleAddCategory}
            disabled={!newCategoryName.trim()}
            icon={<Plus size={16} aria-hidden="true" />}>
            Categorie toevoegen
          </PrimaryButton>
        </div>
      </>
    );
  }

  return (
    <>
      <SheetHeader title="Item toevoegen" onClose={onClose} />
      {headerExtra}

      <input
        ref={titleRef}
        autoFocus={autoFocusTitle}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onFocus={() => setTitleActive(true)}
        onBlur={() => setTitleActive(false)}
        onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
        placeholder="Bijv. melk of suiker"
        aria-label="Boodschap"
        className="w-full rounded-2xl px-4 py-3.5 text-foreground placeholder:text-muted-foreground outline-none text-[0.9375rem] border transition-all"
        style={fieldStyle(titleActive, !!title)}
      />

      {showSuggestionsSection && (
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[0.68rem] font-semibold uppercase tracking-wider text-muted-foreground">Snel toevoegen</p>
            <button
              type="button"
              onClick={() => setManageOpen("shortcuts")}
              className="text-xs font-semibold focus-ring rounded-md px-1 -mx-1"
              style={{ color: SAGE }}>
              Beheren
            </button>
          </div>
          {quickItems.length > 0 ? (
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
          ) : (
            <div className="flex items-center gap-2">
              <EmptyIllustration src="/states/empty-shortcuts.webp" className="!w-14 !h-14 !mx-0" />
              <p className="text-xs text-muted-foreground">Nog geen snelkoppelingen.</p>
            </div>
          )}
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
              className="w-28 rounded-xl px-3 py-2.5 text-foreground placeholder:text-muted-foreground outline-none text-[0.9375rem] border transition-all"
              style={fieldStyle(false, !!qtyText)}
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[0.68rem] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">Eenheid</p>
          <div role="group" className="flex flex-wrap gap-2" aria-label="Eenheid kiezen">
            {SHOPPING_UNIT_ORDER.map((key) => (
              <KeuzeChip key={key} selected={unit === key} onClick={() => selectUnit(key)}>
                {SHOPPING_UNIT_LABELS[key]}
              </KeuzeChip>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-[0.68rem] font-semibold uppercase tracking-wider text-muted-foreground">Categorie</p>
          <button
            type="button"
            onClick={() => setManageOpen("categorieen")}
            className="text-xs font-semibold focus-ring rounded-md px-1 -mx-1"
            style={{ color: SAGE }}>
            Beheren
          </button>
        </div>
        {sortedCategories.length > 0 ? (
          <div role="group" className="flex flex-wrap gap-2" aria-label="Categorie kiezen">
            {sortedCategories.map((c) => (
              <KeuzeChip key={c.id} selected={categoryId === c.id} onClick={() => setCategoryId(c.id)}>
                {c.name}
              </KeuzeChip>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Nog geen categorieën — voeg er een toe via "Beheren".</p>
        )}
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
