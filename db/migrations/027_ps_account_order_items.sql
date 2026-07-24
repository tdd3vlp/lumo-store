-- Allow ready-made PlayStation accounts as order lines. Like the top-ups
-- (migration 026) they have no gift_card_denomination row: denomination_id stays
-- NULL and the region lives in `metadata`.

ALTER TABLE order_items
  DROP CONSTRAINT IF EXISTS order_items_item_type_check;

ALTER TABLE order_items
  ADD CONSTRAINT order_items_item_type_check
  CHECK (item_type IN ('gift_card', 'steam_topup', 'telegram_stars', 'ps_account'));
