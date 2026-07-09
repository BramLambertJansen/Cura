-- Structured amount + unit ("500ml", "1kg") and an optional free-text
-- description for shopping items. Replaces the free-text `quantity` field
-- going forward; existing rows keep their `quantity` text and the app falls
-- back to it (formatShoppingQuantity in selectors.ts) until edited.

alter table public.shopping_items
  add column amount numeric,
  add column unit text check (unit in ('stuks', 'g', 'kg', 'ml', 'l')),
  add column description text;
