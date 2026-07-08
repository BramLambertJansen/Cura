import { useRef, useState } from "react";
import { motion } from "motion/react";
import { Plus } from "lucide-react";
import { useCuraStore } from "../../../stores/useCuraStore";
import { useShoppingList, useTaskViews } from "../../../stores/useViews";
import { stagger, fadeUp } from "../../lib/motion";
import { SAGE } from "../../lib/constants";
import { PageHeader, Leeg, Kop, PillButton, VerwijderKnop, fieldBorderColor, fieldBoxShadow } from "../../components/shared";
import { BoodschapRij } from "../../components/BoodschapRij";

/**
 * Quick-add row with an optional "aantal" field alongside the title — a
 * two-field variant of shared.tsx's `TaakToevoegRij` (same field styling via
 * `fieldBorderColor`/`fieldBoxShadow`), feature-local since nothing else in
 * the app needs a quantity field on its quick-add row.
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
    <div className="flex gap-2 mb-7">
      <input
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        onFocus={() => setActive("quantity")}
        onBlur={() => setActive(null)}
        onKeyDown={(e) => { if (e.key === "Enter") titleRef.current?.focus(); }}
        placeholder="Aantal"
        aria-label="Aantal (optioneel)"
        className="w-20 flex-shrink-0 rounded-2xl px-2 py-3 text-foreground placeholder:text-muted-foreground/70 outline-none text-sm border text-center transition-all"
        style={{
          background: "var(--input-background)",
          borderColor: fieldBorderColor({ active: active === "quantity", hasValue: !!quantity }),
          boxShadow: fieldBoxShadow({ active: active === "quantity" }),
        }}
      />
      <input
        ref={titleRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onFocus={() => setActive("title")}
        onBlur={() => setActive(null)}
        onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
        placeholder="Wat heb je nodig?"
        aria-label="Item"
        className="flex-1 rounded-2xl px-4 py-3 text-foreground placeholder:text-muted-foreground/70 outline-none text-sm border transition-all"
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
  );
}

export function BoodschappenPage() {
  const { open, checked } = useShoppingList();
  const createShoppingItem = useCuraStore((s) => s.createShoppingItem);
  const toggleShoppingItem = useCuraStore((s) => s.toggleShoppingItem);
  const deleteShoppingItem = useCuraStore((s) => s.deleteShoppingItem);
  const clearCheckedShoppingItems = useCuraStore((s) => s.clearCheckedShoppingItems);
  const clearShoppingList = useCuraStore((s) => s.clearShoppingList);
  const createTask = useCuraStore((s) => s.createTask);
  const tasks = useTaskViews();

  // Avoid spawning a second open "Boodschappen" task — one at a time is enough.
  const hasOpenBoodschappenTask = tasks.some((t) => t.title === "Boodschappen" && !t.done);

  function zetOpMijnDag() {
    const summary = open.map((i) => (i.quantity ? `${i.title} (${i.quantity})` : i.title)).join(", ");
    void createTask({ title: "Boodschappen", description: summary || undefined, planned: true });
  }

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

      {open.length === 0 && checked.length === 0 ? (
        <Leeg icon="🛒" text="Nog niets op je lijst" />
      ) : (
        <>
          <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-2.5">
            {open.map((item) => (
              <motion.div key={item.id} variants={fadeUp}>
                <BoodschapRij
                  item={item}
                  onToggle={() => void toggleShoppingItem(item.id, true)}
                  onDelete={() => void deleteShoppingItem(item.id)}
                />
              </motion.div>
            ))}
          </motion.div>

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
