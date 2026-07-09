import { useRef, useState } from "react";
import { motion } from "motion/react";
import { Plus, ShoppingCart } from "lucide-react";
import { useCuraStore } from "../../../stores/useCuraStore";
import { useShoppingList, useTaskViews } from "../../../stores/useViews";
import { stagger, fadeUp } from "../../lib/motion";
import { SAGE } from "../../lib/constants";
import { PageHeader, Leeg, Kop, PillButton, VerwijderKnop, fieldBorderColor, fieldBoxShadow } from "../../components/shared";
import { BoodschapRij } from "../../components/BoodschapRij";

const QUICK_ITEMS = ["Melk", "Brood", "Eieren", "Bananen", "Wc-papier", "Pasta"];

const normalizeTitle = (title: string) => title.trim().toLocaleLowerCase("nl-NL");

/**
 * Quick-add row for the boodschappenlijst. Item first, quantity second: most
 * users think "melk" before they think "2 pakken", and Enter still adds fast.
 */
function BoodschapToevoegRij({ onAdd }: { onAdd: (title: string, quantity?: string) => void }) {
  const [quantity, setQuantity] = useState("");
  const [title, setTitle] = useState("");
  const [active, setActive] = useState<"quantity" | "title" | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  function submit() {
    if (!title.trim()) return;
    onAdd(title.trim(), quantity.trim() || undefined);
    setTitle("");
    setQuantity("");
    titleRef.current?.focus();
  }

  return (
    <div className="mb-4">
      <div className="flex gap-2">
        <input
          ref={titleRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={() => setActive("title")}
          onBlur={() => setActive(null)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          placeholder="Wat heb je nodig?"
          aria-label="Item"
          className="min-w-0 flex-1 rounded-2xl px-4 py-3 text-foreground placeholder:text-muted-foreground/70 outline-none text-sm border transition-all"
          style={{
            background: "var(--input-background)",
            borderColor: fieldBorderColor({ active: active === "title", hasValue: !!title }),
            boxShadow: fieldBoxShadow({ active: active === "title" }),
          }}
        />
        <motion.button whileTap={{ scale: 0.88 }} onClick={submit} disabled={!title.trim()}
          aria-label="Item toevoegen"
          className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 disabled:opacity-40 focus-ring focus-visible:ring-offset-2"
          style={{ background: SAGE }}>
          <Plus size={17} className="text-white" aria-hidden="true" />
        </motion.button>
      </div>
      <input
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        onFocus={() => setActive("quantity")}
        onBlur={() => setActive(null)}
        onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
        placeholder="Aantal optioneel, bv. 2 of 1 pak"
        aria-label="Aantal (optioneel)"
        className="mt-2 w-full rounded-2xl px-4 py-2.5 text-foreground placeholder:text-muted-foreground/70 outline-none text-xs border transition-all"
        style={{
          background: "var(--input-background)",
          borderColor: fieldBorderColor({ active: active === "quantity", hasValue: !!quantity }),
          boxShadow: fieldBoxShadow({ active: active === "quantity" }),
        }}
      />
    </div>
  );
}

function SnelleBoodschappen({
  items,
  onAdd,
}: {
  items: string[];
  onAdd: (title: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="mb-7">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1" aria-label="Snelle boodschappen">
        {items.map((item) => (
          <PillButton key={item} size="sm" onClick={() => onAdd(item)} icon={<Plus size={12} aria-hidden="true" />}>
            {item}
          </PillButton>
        ))}
      </div>
    </div>
  );
}

function BoodschappenStand({ openCount, checkedCount }: { openCount: number; checkedCount: number }) {
  return (
    <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3 text-sm" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="flex items-center gap-2 min-w-0">
        <ShoppingCart size={16} className="text-muted-foreground flex-shrink-0" aria-hidden="true" />
        <span className="font-medium text-foreground truncate">
          {openCount} {openCount === 1 ? "ding" : "dingen"} te halen
        </span>
      </div>
      {checkedCount > 0 && (
        <span className="text-xs text-muted-foreground flex-shrink-0">
          {checkedCount} gehaald
        </span>
      )}
    </div>
  );
}

export function BoodschappenPage() {
  const { open, checked, openGroups } = useShoppingList();
  const createShoppingItem = useCuraStore((s) => s.createShoppingItem);
  const toggleShoppingItem = useCuraStore((s) => s.toggleShoppingItem);
  const deleteShoppingItem = useCuraStore((s) => s.deleteShoppingItem);
  const clearCheckedShoppingItems = useCuraStore((s) => s.clearCheckedShoppingItems);
  const clearShoppingList = useCuraStore((s) => s.clearShoppingList);
  const createTask = useCuraStore((s) => s.createTask);
  const tasks = useTaskViews();

  // Avoid spawning a second open "Boodschappen" task. One at a time is enough.
  const hasOpenBoodschappenTask = tasks.some((t) => t.title === "Boodschappen" && !t.done);

  function zetOpMijnDag() {
    const summary = open.map((i) => (i.quantity ? `${i.title} (${i.quantity})` : i.title)).join(", ");
    void createTask({ title: "Boodschappen", description: summary || undefined, planned: true });
  }

  const existingTitles = new Set([...open, ...checked].map((item) => normalizeTitle(item.title)));
  const quickItems = QUICK_ITEMS.filter((item) => !existingTitles.has(normalizeTitle(item)));

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

      <BoodschapToevoegRij onAdd={(title, quantity) => void createShoppingItem({ title, quantity })} />
      <SnelleBoodschappen items={quickItems} onAdd={(title) => void createShoppingItem({ title })} />

      {open.length === 0 && checked.length === 0 ? (
        <Leeg icon="🛒" text="Nog niets op je lijst" />
      ) : (
        <>
          <BoodschappenStand openCount={open.length} checkedCount={checked.length} />

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
              <Kop>Al gehaald</Kop>
              <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-2.5">
                {checked.map((item) => (
                  <motion.div key={item.id} variants={fadeUp}>
                    <BoodschapRij
                      item={item}
                      onToggle={() => void toggleShoppingItem(item.id, false)}
                      onDelete={() => void deleteShoppingItem(item.id)}
                    />
                  </motion.div>
                ))}
              </motion.div>
              <div className="mt-3">
                <PillButton onClick={() => void clearCheckedShoppingItems()}>Wis afgevinkte items</PillButton>
              </div>
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
