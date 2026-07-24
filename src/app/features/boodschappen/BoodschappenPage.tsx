import { useState } from "react";
import { useNavigate } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Check, CheckCircle2, ChevronDown, Plus, ShoppingCart } from "lucide-react";
import { useCuraStore } from "../../../stores/useCuraStore";
import { useShoppingList, useTaskViews } from "../../../stores/useViews";
import { useSheets } from "../../sheetContext";
import { stagger, fadeUp } from "../../lib/motion";
import { SAGE, SHADOW } from "../../lib/constants";
import { PageHeader, PillButton, VerwijderKnop, IconButton } from "../../components/shared";
import { BoodschapRij } from "../../components/BoodschapRij";

export function BoodschappenPage() {
  const navigate = useNavigate();
  const { open, checked, openGroups } = useShoppingList();
  const [wagentjeOpen, setWagentjeOpen] = useState(false);
  const toggleShoppingItem = useCuraStore((s) => s.toggleShoppingItem);
  const deleteShoppingItem = useCuraStore((s) => s.deleteShoppingItem);
  const clearCheckedShoppingItems = useCuraStore((s) => s.clearCheckedShoppingItems);
  const clearShoppingList = useCuraStore((s) => s.clearShoppingList);
  const createTask = useCuraStore((s) => s.createTask);
  const tasks = useTaskViews();
  const { openAddBoodschap } = useSheets();

  // Avoid spawning a second open "Boodschappen" task. One at a time is enough.
  const hasOpenBoodschappenTask = tasks.some((t) => t.title === "Boodschappen" && !t.done);

  function zetOpMijnDag() {
    const summary = open.map((i) => (i.quantity ? `${i.title} (${i.quantity})` : i.title)).join(", ");
    void createTask({ title: "Boodschappen", description: summary || undefined, planned: true });
  }

  const isEmpty = open.length === 0 && checked.length === 0;

  return (
    <div className="relative">
      {/* Watercolour hero, bleeding to the screen edges and fading into the page. */}
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-[150px] overflow-hidden pointer-events-none">
        <img
          src="/landing-header.webp"
          alt=""
          className="w-full h-full object-cover"
          style={{
            objectPosition: "72% 35%",
            WebkitMaskImage: "linear-gradient(to bottom, black 40%, transparent 98%)",
            maskImage: "linear-gradient(to bottom, black 40%, transparent 98%)",
          }}
        />
      </div>

      <div className="relative px-5 pt-14 pb-8">
        <IconButton
          onClick={() => navigate("/meer")}
          label="Terug naar Meer"
          tone="card" className="mb-4"
          icon={<ArrowLeft size={16} className="text-foreground" aria-hidden="true" />} />
        <PageHeader
          title="Boodschappen"
          subtitle="Wat moet er nog gehaald worden?"
          action={
            open.length > 0 && !hasOpenBoodschappenTask
              ? <PillButton onClick={zetOpMijnDag}>Zet op mijn dag</PillButton>
              : undefined
          }
        />

        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          onClick={openAddBoodschap}
          className="mb-7 w-full flex items-center gap-3 rounded-full border border-border/60 bg-card pl-5 pr-3.5 py-3.5 text-left focus-ring"
          style={{ boxShadow: SHADOW }}>
          <span className="flex-1 min-w-0 truncate text-sm text-muted-foreground">Iets toevoegen aan je lijst…</span>
          <span
            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white"
            style={{ background: "var(--gradient-primary)", boxShadow: "0 3px 10px color-mix(in srgb, var(--primary) 32%, transparent)" }}>
            <Plus size={15} strokeWidth={2.6} aria-hidden="true" />
          </span>
        </motion.button>

        {isEmpty ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32 }}
            className="rounded-3xl border border-border/60 bg-card px-5 py-12 text-center"
            style={{ boxShadow: SHADOW }}>
            <div
              className="w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center"
              style={{ background: "radial-gradient(circle at 40% 35%, color-mix(in srgb, var(--accent) 55%, var(--card)) 0%, color-mix(in srgb, var(--accent) 20%, var(--card)) 70%)" }}>
              <ShoppingCart size={24} style={{ color: SAGE }} strokeWidth={1.9} aria-hidden="true" />
            </div>
            <p className="font-display italic text-[1.05rem] text-foreground">Nog niets op je lijst</p>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {openGroups.map((group) => (
              <section key={group.key} aria-labelledby={`boodschappen-${group.key}`}>
                <div
                  id={`boodschappen-${group.key}`}
                  className="mb-2.5 ml-0.5 inline-flex items-center gap-2 rounded-full px-3 py-1.5"
                  style={{ background: "color-mix(in srgb, var(--muted-foreground) 7%, transparent)" }}>
                  <span className="w-[7px] h-[7px] rounded-full flex-shrink-0" style={{ background: SAGE }} aria-hidden="true" />
                  <span className="text-[0.66rem] font-semibold uppercase tracking-wider text-muted-foreground">{group.label}</span>
                  <span className="text-[0.66rem] font-semibold text-muted-foreground/60">{group.items.length}</span>
                </div>
                <motion.div
                  variants={stagger}
                  initial="initial"
                  animate="animate"
                  className="rounded-3xl border border-border/60 bg-card px-4"
                  style={{ boxShadow: SHADOW }}>
                  {group.items.map((item, i) => (
                    <motion.div key={item.id} variants={fadeUp}>
                      <BoodschapRij
                        item={item}
                        isLast={i === group.items.length - 1}
                        onToggle={() => void toggleShoppingItem(item.id, true)}
                        onDelete={() => void deleteShoppingItem(item.id)}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              </section>
            ))}

            {checked.length > 0 && (
              <div
                className="rounded-2xl border border-border/60 overflow-hidden"
                style={{ background: "color-mix(in srgb, var(--card) 60%, transparent)" }}>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setWagentjeOpen((v) => !v)}
                  aria-expanded={wagentjeOpen}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 focus-ring">
                  <span className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                    <CheckCircle2 size={14} style={{ color: SAGE }} aria-hidden="true" />
                    {checked.length} in je wagentje
                  </span>
                  <motion.span
                    animate={{ rotate: wagentjeOpen ? 180 : 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="flex text-muted-foreground"
                    aria-hidden="true">
                    <ChevronDown size={15} />
                  </motion.span>
                </motion.button>
                <AnimatePresence initial={false}>
                  {wagentjeOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.24 }}
                      className="overflow-hidden">
                      <div className="px-3 pb-3 pt-0.5 flex flex-col gap-1.5">
                        {checked.map((item) => (
                          <motion.button
                            key={item.id}
                            type="button"
                            whileTap={{ scale: 0.98 }}
                            onClick={() => void toggleShoppingItem(item.id, false)}
                            className="flex items-center gap-3 rounded-xl bg-card px-3 py-2.5 text-left focus-ring">
                            <span className="w-[19px] h-[19px] rounded-full flex items-center justify-center flex-shrink-0" style={{ background: SAGE }} aria-hidden="true">
                              <Check size={10} strokeWidth={3.4} className="text-white" />
                            </span>
                            <span className="flex-1 min-w-0 truncate text-sm text-muted-foreground line-through">{item.title}</span>
                            <span className="flex-shrink-0 text-[0.66rem] text-muted-foreground/60">terug</span>
                          </motion.button>
                        ))}
                        <div className="pt-2">
                          <PillButton onClick={() => void clearCheckedShoppingItems()}>Wis afgevinkte items</PillButton>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            <div className="pt-2">
              <VerwijderKnop label="Wis hele lijst" confirmLabel="Ja, leegmaken" onConfirm={() => void clearShoppingList()} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
