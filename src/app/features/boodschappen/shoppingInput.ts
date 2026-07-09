import type { CreateShoppingItemInput } from "../../../data/store";

const QUANTITY_UNITS = [
  "bak",
  "bakje",
  "blik",
  "doos",
  "doosje",
  "fles",
  "flessen",
  "gram",
  "kg",
  "kilo",
  "l",
  "liter",
  "pak",
  "pakken",
  "pot",
  "potje",
  "rol",
  "rollen",
  "stuks",
  "zak",
  "zakje",
];

const QUANTITY_PATTERN = "\\d+(?:[,.]\\d+)?|[1-9]\\/[1-9]";
const leadingQuantity = new RegExp(`^(${QUANTITY_PATTERN})(?:\\s+(${QUANTITY_UNITS.join("|")}))?\\s+(.+)$`, "i");
const trailingQuantity = new RegExp(`^(.+?)\\s+(${QUANTITY_PATTERN})(?:\\s+(${QUANTITY_UNITS.join("|")}))?$`, "i");

export function parseShoppingInput(raw: string): CreateShoppingItemInput | undefined {
  const value = raw.trim().replace(/\s+/g, " ");
  if (!value) return undefined;

  const leading = value.match(leadingQuantity);
  if (leading) {
    const quantity = [leading[1], leading[2]].filter(Boolean).join(" ");
    return { title: leading[3].trim(), quantity };
  }

  const trailing = value.match(trailingQuantity);
  if (trailing) {
    const quantity = [trailing[2], trailing[3]].filter(Boolean).join(" ");
    return { title: trailing[1].trim(), quantity };
  }

  return { title: value };
}
