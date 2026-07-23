-- Let orders carry non-catalog line items: wallet top-ups (Steam) and Telegram
-- Stars. These have no gift_card_denomination row, so denomination_id stays
-- NULL and the account/amount details live in `metadata`.
--
-- The original item_type CHECK (migration 001) only allowed 'gift_card'; widen
-- it. Inline column checks get the conventional name <table>_<column>_check.

ALTER TABLE order_items
  DROP CONSTRAINT IF EXISTS order_items_item_type_check;

ALTER TABLE order_items
  ADD CONSTRAINT order_items_item_type_check
  CHECK (item_type IN ('gift_card', 'steam_topup', 'telegram_stars'));

ALTER TABLE order_items
  ADD COLUMN title text,
  ADD COLUMN metadata jsonb;
