-- Optional manual category for shopping items.
-- Existing rows keep using the title-based fallback in selectors until a
-- category is explicitly chosen in the UI.

alter table public.shopping_items
  add column category text
  check (category in ('fresh', 'cold', 'pantry', 'household', 'other'));
