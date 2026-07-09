import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { ChevronDown, Plus, X } from "lucide-react";
import { useCuraStore } from "../../../stores/useCuraStore";
import { useShoppingList, useTaskViews } from "../../../stores/useViews";
import { stagger, fadeUp } from "../../lib/motion";
import { SAGE } from "../../lib/constants";
import { PageHeader, Leeg, Kop, PillButton, VerwijderKnop, VeldSelect, fieldBorderColor, fieldBoxShadow } from "../../components/shared";
import { BoodschapRij } from "../../components/BoodschapRij";
import {
  SHOPPING_CATEGORY_LABELS,
  SHOPPING_CATEGORY_ORDER,
  SHOPPING_UNIT_LABELS,
  SHOPPING_UNIT_ORDER,
  shoppingAmountOptions,
  shoppingCategory,
} from "../../../data/selectors";
import type { ShoppingCategoryKey, ShoppingUnitKey } from "../../../data/types";

const DEFAULT_QUICK_ITEMS = ["Melk", "Brood", "Eieren", "Bananen", "Wc-papier", "Pasta"];
const QUICK_ITEMS_STORAGE_KEY = "cura:shopping:quick-items:v1";

const normalizeTitle = (title: string) => title.trim().toLocaleLowerCase("nl-NL");

function readCustomQuickItems(): string[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(QUICK_ITEMS_STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      : [];
  } catch {
    return [];
  }
}

function useQuickShoppingItems() {
  const [customItems, setCustomItems] = useState<string[]>(() => readCustomQuickItems());

  useEffect(() => {
    try {
      localStorage.setItem(QUICK_ITEMS_STORAGE_KEY, JSON.stringify(customItems));
    } catch {
      // Snelkeuzes zijn gemak, geen kritieke data.
    }
  }, [customItems]);

  function addQuickItem(rawTitle: string) {
    const title = rawTitle.trim();
    if (!title) return;
    const normalized = normalizeTitle(title);
    if ([...DEFAULT_QUICK_ITEMS, ...customItems].some((item) => normalizeTitle(item) === normalized)) return;
    setCustomItems((items) => [...items, title]);
  }

  function removeQuickItem(title: string) {
    const normalized = normalizeTitle(title);
    setCustomItems((items) => items.filter((item) => normalizeTitle(item) !== normalized));
  }

  return {
    items: [
      ...DEFAULT_QUICK_ITEMS.map((title) => ({ title, custom: false })),
      ...customItems.map((title) => ({ title, custom: true })),
    ],
    addQuickItem,
    removeQuickItem,
  };
}

/**
 * Quick-add row for the boodschappenlijst: title + an optional amount, plus
 * unit and category pickers below ("500ml melk", "1kg suiker", or just
 * "melk" with no amount at all).
 */
function BoodschapToevoegRij({
  onAdd,
}: {
  onAdd: (title: string, amount: number | undefined, unit: ShoppingUnitKey | undefined, category?: ShoppingCategoryKey) => void;
}) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState<ShoppingUnitKey>("stuks");
  const [titleActive, setTitleActive] = useState(false);
  const [category, setCategory] = useState<ShoppingCategoryKey>("other");
  const [categoryTouched, setCategoryTouched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function changeTitle(next: string) {
    setTitle(next);
    if (!categoryTouched) setCategory(next.trim() ? shoppingCategory(next) : "other");
  }

  function changeUnit(next: ShoppingUnitKey) {
    setUnit(next);
    setAmount("");
  }

  function submit() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    onAdd(trimmedTitle, amount ? Number(amount) : undefined, unit, category);
    setTitle("");
    setAmount("");
    setUnit("stuks");
    setCategory("other");
    setCategoryTouched(false);
    inputRef.current?.focus();
  }

  return (
    <div className="mb-4">
      <div className="flex gap-2">
        <input
          ref={inputRef}
          value={title}
          onChange={(e) => changeTitle(e.target.value)}
          onFocus={() => setTitleActive(true)}
          onBlur={() => setTitleActive(false)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          placeholder="Bijv. melk of suiker"
          aria-label="Boodschap"
          className="min-w-0 flex-1 rounded-2xl px-4 py-3 text-foreground placeholder:text-muted-foreground/70 outline-none text-sm border transition-all"
          style={{
            background: "var(--input-background)",
            borderColor: fieldBorderColor({ active: titleActive, hasValue: !!title }),
            boxShadow: fieldBoxShadow({ active: titleActive }),
          }}
        />
        <VeldSelect
          value={amount}
          onChange={setAmount}
          options={shoppingAmountOptions(unit)}
          ariaLabel="Aantal"
          className="min-w-0 w-24 py-3 text-sm"
        />
        <motion.button whileTap={{ scale: 0.88 }} onClick={submit} disabled={!title.trim()}
          aria-label="Item toevoegen"
          className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 disabled:opacity-40 focus-ring focus-visible:ring-offset-2"
          style={{ background: SAGE }}>
          <Plus size={17} className="text-white" aria-hidden="true" />
        </motion.button>
      </div>
      <div className="mt-2 flex gap-1.5 overflow-x-auto scrollbar-hide pb-1" aria-label="Eenheid kiezen">
        {SHOPPING_UNIT_ORDER.map((key) => {
          const selected = unit === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => changeUnit(key)}
              aria-pressed={selected}
              className="flex-shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold focus-ring"
              style={{
                background: selected ? "color-mix(in srgb, var(--primary) 12%, transparent)" : "var(--secondary)",
                color: selected ? SAGE : "var(--muted-foreground)",
              }}>
              {SHOPPING_UNIT_LABELS[key]}
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex gap-1.5 overflow-x-auto scrollbar-hide pb-1" aria-label="Categorie kiezen">
        {SHOPPING_CATEGORY_ORDER.map((key) => {
          const selected = category === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                setCategory(key);
                setCategoryTouched(true);
              }}
              aria-pressed={selected}
              className="flex-shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold focus-ring"
              style={{
                background: selected ? "color-mix(in srgb, var(--primary) 12%, transparent)" : "var(--secondary)",
                color: selected ? SAGE : "var(--muted-foreground)",
              }}>
              {SHOPPING_CATEGORY_LABELS[key]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SnelleBoodschappen({
  items,
  onAdd,
  onSave,
  onRemove,
}: {
  items: { title: string; custom: boolean }[];
  onAdd: (title: string) => void;
  onSave: (title: string) => void;
  onRemove: (title: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [newItem, setNewItem] = useState("");
  const [active, setActive] = useState(false);

  function saveQuickItem() {
    if (!newItem.trim()) return;
    onSave(newItem);
    setNewItem("");
  }

  return (
    <div className="mb-7">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold text-muted-foreground bg-secondary focus-ring">
        Snel toevoegen
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.18 }} aria-hidden="true">
          <ChevronDown size={13} />
        </motion.span>
      </button>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 rounded-2xl border border-border/60 bg-card px-3 py-3"
          style={{ boxShadow: "var(--shadow-card)" }}>
          {items.length > 0 ? (
            <div className="flex flex-wrap gap-2" aria-label="Snelle boodschappen">
              {items.map((item) => (
                <span key={`${item.custom ? "custom" : "default"}-${item.title}`} className="inline-flex items-center rounded-full bg-secondary">
                  <button
                    type="button"
                    onClick={() => onAdd(item.title)}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-muted-foreground focus-ring">
                    <Plus size={12} aria-hidden="true" />
                    {item.title}
                  </button>
                  {item.custom && (
                    <button
                      type="button"
                      onClick={() => onRemove(item.title)}
                      aria-label={`${item.title} uit snelkeuzes halen`}
                      className="mr-1 flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground/70 focus-ring">
                      <X size={11} aria-hidden="true" />
                    </button>
                  )}
                </span>
              ))}
            </div>
          ) : (
            <p className="px-1 pb-2 text-xs text-muted-foreground">Alles uit je snelkeuzes staat al op de lijst.</p>
          )}

          <div className="mt-3 flex gap-2">
            <input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onFocus={() => setActive(true)}
              onBlur={() => setActive(false)}
              onKeyDown={(e) => { if (e.key === "Enter") saveQuickItem(); }}
              placeholder="Product bewaren"
              aria-label="Product toevoegen aan snelkeuzes"
              className="min-w-0 flex-1 rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/70 outline-none border transition-all"
              style={{
                background: "var(--input-background)",
                borderColor: fieldBorderColor({ active, hasValue: !!newItem }),
                boxShadow: fieldBoxShadow({ active }),
              }}
            />
            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={saveQuickItem}
              disabled={!newItem.trim()}
              aria-label="Product bewaren in snelkeuzes"
              className="h-9 w-9 flex-shrink-0 rounded-xl flex items-center justify-center disabled:opacity-40 focus-ring"
              style={{ background: SAGE }}>
              <Plus size={15} className="text-white" aria-hidden="true" />
            </motion.button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export function BoodschappenPage() {
  const { open, checked, openGroups } = useShoppingList();
  const [checkedOpen, setCheckedOpen] = useState(false);
  const createShoppingItem = useCuraStore((s) => s.createShoppingItem);
  const updateShoppingItem = useCuraStore((s) => s.updateShoppingItem);
  const toggleShoppingItem = useCuraStore((s) => s.toggleShoppingItem);
  const deleteShoppingItem = useCuraStore((s) => s.deleteShoppingItem);
  const clearCheckedShoppingItems = useCuraStore((s) => s.clearCheckedShoppingItems);
  const clearShoppingList = useCuraStore((s) => s.clearShoppingList);
  const createTask = useCuraStore((s) => s.createTask);
  const tasks = useTaskViews();
  const quickShoppingItems = useQuickShoppingItems();

  // Avoid spawning a second open "Boodschappen" task. One at a time is enough.
  const hasOpenBoodschappenTask = tasks.some((t) => t.title === "Boodschappen" && !t.done);

  function zetOpMijnDag() {
    const summary = open.map((i) => (i.quantity ? `${i.title} (${i.quantity})` : i.title)).join(", ");
    void createTask({ title: "Boodschappen", description: summary || undefined, planned: true });
  }

  const existingTitles = new Set([...open, ...checked].map((item) => normalizeTitle(item.title)));
  const quickItems = quickShoppingItems.items.filter((item) => !existingTitles.has(normalizeTitle(item.title)));

  return (
    <div className="px-5 pt-14 pb-8">
      <PageHeader
        title="Boodschappen"
        subtitle="Wat moet er nog gehaald worden?"
        action={
          open.length > 0 && !hasOpenBoodschappenTask
            ? <PillButton onClick={zetOpMijnDag}>Zet op mijn dag</PillButton>
            : undefined
        }
      />

      <BoodschapToevoegRij onAdd={(title, amount, unit, category) => void createShoppingItem({ title, amount, unit, category })} />
      <SnelleBoodschappen
        items={quickItems}
        onAdd={(title) => void createShoppingItem({ title, category: shoppingCategory(title) })}
        onSave={quickShoppingItems.addQuickItem}
        onRemove={quickShoppingItems.removeQuickItem}
      />

      {open.length === 0 && checked.length === 0 ? (
        <Leeg icon="🛒" text="Nog niets op je lijst" />
      ) : (
        <>
          <div className="space-y-5">
            {openGroups.map((group) => (
              <section key={group.key} aria-labelledby={`boodschappen-${group.key}`}>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <Kop id={`boodschappen-${group.key}`}>{group.label}</Kop>
                  <span className="text-xs text-muted-foreground">
                    {group.items.length} {group.items.length === 1 ? "ding" : "dingen"}
                  </span>
                </div>
                <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-2.5">
                  {group.items.map((item) => (
                    <motion.div key={item.id} variants={fadeUp}>
                      <BoodschapRij
                        item={item}
                        onToggle={() => void toggleShoppingItem(item.id, true)}
                        onUpdate={(patch) => void updateShoppingItem(item.id, patch)}
                        onDelete={() => void deleteShoppingItem(item.id)}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              </section>
            ))}
          </div>

          {checked.length > 0 && (
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setCheckedOpen((v) => !v)}
                aria-expanded={checkedOpen}
                className="mb-2 w-full flex items-center justify-between gap-3 rounded-2xl px-3 py-2 text-left focus-ring">
                <span className="text-sm text-muted-foreground font-display italic">Al gehaald</span>
                <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                  {checked.length} {checked.length === 1 ? "ding" : "dingen"}
                  <motion.span animate={{ rotate: checkedOpen ? 180 : 0 }} transition={{ duration: 0.18 }} aria-hidden="true">
                    <ChevronDown size={14} />
                  </motion.span>
                </span>
              </button>
              {checkedOpen && (
                <>
                  <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-2.5">
                    {checked.map((item) => (
                      <motion.div key={item.id} variants={fadeUp}>
                        <BoodschapRij
                          item={item}
                          onToggle={() => void toggleShoppingItem(item.id, false)}
                          onUpdate={(patch) => void updateShoppingItem(item.id, patch)}
                          onDelete={() => void deleteShoppingItem(item.id)}
                        />
                      </motion.div>
                    ))}
                  </motion.div>
                  <div className="mt-3">
                    <PillButton onClick={() => void clearCheckedShoppingItems()}>Wis afgevinkte items</PillButton>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="mt-8">
            <VerwijderKnop label="Wis hele lijst" confirmLabel="Ja, leegmaken" onConfirm={() => void clearShoppingList()} />
          </div>
        </>
      )}
    </div>
  );
}
