import { memo, useRef, useState, type ReactNode } from "react";
import { motion, useMotionValue, useReducedMotion, useTransform, type PanInfo } from "motion/react";
import { Check, Minus, Pencil, Plus, Trash2, X } from "lucide-react";
import type { ShoppingItemView } from "../../data/types";
import { CARD_BORDER, Checkbox, IconButton, fieldBorderColor, fieldBoxShadow } from "./shared";
import { SHADOW } from "../lib/constants";

type ShoppingItemPatch = { title?: string; quantity?: string };
const SWIPE_DELETE_DISTANCE = 96;

export function nextShoppingQuantity(quantity: string | undefined, delta: 1 | -1): string | undefined {
  const value = quantity?.trim();
  if (!value) return delta > 0 ? "1" : undefined;
  const match = value.match(/^(\d+)(.*)$/);
  if (!match) return delta > 0 ? `1 ${value}` : undefined;
  const next = Number(match[1]) + delta;
  if (next <= 0) return undefined;
  return `${next}${match[2]}`;
}

function QuantityButton({
  onClick, disabled, label, children,
}: { onClick: () => void; disabled?: boolean; label: string; children: ReactNode }) {
  return (
    <motion.button
      type="button"
      whileTap={disabled ? undefined : { scale: 0.88 }}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="w-7 h-7 rounded-full flex items-center justify-center bg-secondary text-muted-foreground disabled:opacity-35 disabled:cursor-not-allowed focus-ring">
      {children}
    </motion.button>
  );
}

/**
 * A single boodschappenlijst row: checkbox + title/aantal + direct delete.
 * The title area toggles too, because on a shopping trip the whole row should
 * feel easy to hit without turning delete into a risky accidental action.
 */
export const BoodschapRij = memo(function BoodschapRij({
  item, onToggle, onDelete, onUpdate,
}: { item: ShoppingItemView; onToggle: () => void; onDelete: () => void; onUpdate: (patch: ShoppingItemPatch) => void }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [quantity, setQuantity] = useState(item.quantity ?? "");
  const [active, setActive] = useState<"title" | "quantity" | null>(null);
  const reduceMotion = useReducedMotion();
  const x = useMotionValue(0);
  const deleteOpacity = useTransform(x, [-48, -10], [1, 0]);
  const deleteScale = useTransform(x, [-60, -10], [1, 0.6]);
  const wasDragged = useRef(false);
  const canSave = title.trim().length > 0;

  function beginEdit() {
    setTitle(item.title);
    setQuantity(item.quantity ?? "");
    setEditing(true);
  }

  function cancelEdit() {
    setTitle(item.title);
    setQuantity(item.quantity ?? "");
    setEditing(false);
  }

  function saveEdit() {
    if (!canSave) return;
    onUpdate({ title: title.trim(), quantity: quantity.trim() || undefined });
    setEditing(false);
  }

  function adjustQuantity(delta: 1 | -1) {
    onUpdate({ quantity: nextShoppingQuantity(item.quantity, delta) });
  }

  function handleDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    if (info.offset.x < -SWIPE_DELETE_DISTANCE) onDelete();
    setTimeout(() => { wasDragged.current = false; }, 0);
  }

  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: item.checked ? 0.58 : 1, y: 0 }} exit={{ opacity: 0 }} className="relative">
      {!editing && (
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-2xl flex items-center justify-end pr-5 pointer-events-none"
          style={{ background: "color-mix(in srgb, var(--destructive) 12%, transparent)" }}>
          <motion.div style={{ opacity: deleteOpacity, scale: deleteScale }} className="w-7 h-7 rounded-full flex items-center justify-center">
            <span className="w-full h-full rounded-full flex items-center justify-center" style={{ background: "var(--destructive)" }}>
              <Trash2 size={13} strokeWidth={2.5} className="text-white" />
            </span>
          </motion.div>
        </div>
      )}
      <motion.div
        drag={!editing && !reduceMotion ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0.65, right: 0.08 }}
        dragMomentum={false}
        onDragStart={() => { wasDragged.current = true; }}
        onDragEnd={handleDragEnd}
        onClickCapture={(e) => {
          if (wasDragged.current) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        className={`relative z-10 flex items-center gap-3.5 rounded-2xl px-4 py-3.5 ${item.checked ? "bg-card" : "bg-card-active"} ${CARD_BORDER}`}
        style={{ x, touchAction: "pan-y", boxShadow: SHADOW }}>
        {editing ? (
          <>
            <div className="flex-1 min-w-0 grid grid-cols-[minmax(0,1fr)_5.5rem] gap-2">
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onFocus={() => setActive("title")}
                onBlur={() => setActive(null)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveEdit();
                  if (e.key === "Escape") cancelEdit();
                }}
                aria-label="Boodschap"
                className="min-w-0 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none border transition-all"
                style={{
                  background: "var(--input-background)",
                  borderColor: fieldBorderColor({ active: active === "title", hasValue: !!title, invalid: !canSave }),
                  boxShadow: fieldBoxShadow({ active: active === "title", invalid: !canSave }),
                }}
              />
              <input
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                onFocus={() => setActive("quantity")}
                onBlur={() => setActive(null)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveEdit();
                  if (e.key === "Escape") cancelEdit();
                }}
                placeholder="Aantal"
                aria-label="Aantal"
                className="min-w-0 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none border transition-all"
                style={{
                  background: "var(--input-background)",
                  borderColor: fieldBorderColor({ active: active === "quantity", hasValue: !!quantity }),
                  boxShadow: fieldBoxShadow({ active: active === "quantity" }),
                }}
              />
            </div>
            <div className="flex items-center gap-1">
              <IconButton
                size={8}
                tone="primary"
                onClick={saveEdit}
                label={`${item.title} opslaan`}
                className={canSave ? "" : "opacity-40 pointer-events-none"}
                icon={<Check size={13} className="text-white" aria-hidden="true" />}
              />
              <IconButton
                size={8}
                onClick={cancelEdit}
                label="Bewerken annuleren"
                icon={<X size={13} className="text-muted-foreground" aria-hidden="true" />}
              />
            </div>
          </>
        ) : (
          <>
            <Checkbox
              checked={item.checked}
              onToggle={onToggle}
              label={item.checked ? `${item.title} terugzetten` : `${item.title} afvinken`}
            />
            <motion.button
              type="button"
              onClick={onToggle}
              aria-label={item.checked ? `${item.title} terugzetten` : `${item.title} afvinken`}
              animate={{ color: item.checked ? "var(--muted-foreground)" : "var(--foreground)" }}
              className="flex-1 min-w-0 text-left focus-ring rounded-xl -my-1 py-1">
              <span className={`block text-[0.9375rem] font-medium leading-snug truncate ${item.checked ? "line-through" : ""}`}>
                {item.title}
              </span>
              {item.quantity && (
                <span className={`block text-xs text-muted-foreground font-normal leading-snug truncate ${item.checked ? "line-through" : ""}`}>
                  {item.quantity}
                </span>
              )}
            </motion.button>
            {!item.checked && (
              <div className="flex items-center gap-1.5 flex-shrink-0" aria-label={`Aantal ${item.title} aanpassen`}>
                <QuantityButton
                  onClick={() => adjustQuantity(-1)}
                  disabled={!item.quantity}
                  label={`Aantal ${item.title} verlagen`}>
                  <Minus size={12} aria-hidden="true" />
                </QuantityButton>
                <QuantityButton
                  onClick={() => adjustQuantity(1)}
                  label={`Aantal ${item.title} verhogen`}>
                  <Plus size={12} aria-hidden="true" />
                </QuantityButton>
              </div>
            )}
            <IconButton
              size={8}
              onClick={beginEdit}
              label={`${item.title} bewerken`}
              icon={<Pencil size={13} className="text-muted-foreground" aria-hidden="true" />}
            />
          </>
        )}
      </motion.div>
    </motion.div>
  );
});
