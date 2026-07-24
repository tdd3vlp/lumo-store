-- Generalizes gift_card_denominations from a PSN-Turkey-only table into a
-- multi-product-type catalog (playstation, steam, apple, ...) sourced from
-- NS.gifts curation.
--
-- DEFENSIVE BY DESIGN: gift_card_denominations lives in a Postgres database
-- SHARED with the sibling `market` service, whose own (not-committed-here)
-- migrations may already have added `product_type` / `ns_gifts_service_id` and
-- reshaped the unique constraint. Every step below checks the live catalog
-- before acting, so this migration is safe to apply whether or not the shared
-- DB already carries those changes.

-- 1. product_type: source of truth for what kind of code a denomination is.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gift_card_denominations' AND column_name = 'product_type'
  ) THEN
    ALTER TABLE gift_card_denominations
      ADD COLUMN product_type text NOT NULL DEFAULT 'playstation';
  END IF;
END $$;

-- Enforce the lowercase-word SKU convention (matches market's
-- `{productType}-{region}-{amount}` parser, which requires product_type to be
-- [a-z]+). NOT VALID so it never fails on pre-existing rows; still enforced on
-- every new insert/update.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'gift_card_denominations'
      AND constraint_name = 'gift_card_denominations_product_type_format'
  ) THEN
    ALTER TABLE gift_card_denominations
      ADD CONSTRAINT gift_card_denominations_product_type_format
      CHECK (product_type ~ '^[a-z]+$') NOT VALID;
  END IF;
END $$;

-- 2. ns_gifts_service_id: which NS.gifts catalog service this denomination is
--    restocked from (mirrors the sibling market service's schema).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gift_card_denominations' AND column_name = 'ns_gifts_service_id'
  ) THEN
    ALTER TABLE gift_card_denominations ADD COLUMN ns_gifts_service_id integer;
  END IF;
END $$;

-- 3. is_published: the storefront-visibility gate. Curation can create/link
--    denominations freely; only published ones appear as purchasable products.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gift_card_denominations' AND column_name = 'is_published'
  ) THEN
    ALTER TABLE gift_card_denominations
      ADD COLUMN is_published boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- 4. display_name / image_url: storefront presentation (NS.gifts /stock returns
--    neither a curated name nor imagery).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gift_card_denominations' AND column_name = 'display_name'
  ) THEN
    ALTER TABLE gift_card_denominations ADD COLUMN display_name text;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gift_card_denominations' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE gift_card_denominations ADD COLUMN image_url text;
  END IF;
END $$;

-- 5. Reconcile the unique constraint: the original 3-column
--    (region, currency, amount_minor) unique must become 4-column
--    (region, currency, amount_minor, product_type) so the same face value can
--    exist once per product type. Drop the 3-column one only if it is still
--    present; add the 4-column one only if it is absent (market's migration may
--    already have applied it on the shared DB).
DO $$
DECLARE
  old_constraint text;
BEGIN
  SELECT tc.constraint_name INTO old_constraint
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON kcu.constraint_name = tc.constraint_name
   AND kcu.table_name = tc.table_name
  WHERE tc.table_name = 'gift_card_denominations'
    AND tc.constraint_type = 'UNIQUE'
  GROUP BY tc.constraint_name
  HAVING array_agg(kcu.column_name::text ORDER BY kcu.column_name::text)
       = ARRAY['amount_minor', 'currency', 'region'];

  IF old_constraint IS NOT NULL THEN
    EXECUTE format(
      'ALTER TABLE gift_card_denominations DROP CONSTRAINT %I', old_constraint);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON kcu.constraint_name = tc.constraint_name
     AND kcu.table_name = tc.table_name
    WHERE tc.table_name = 'gift_card_denominations'
      AND tc.constraint_type = 'UNIQUE'
    GROUP BY tc.constraint_name
    HAVING array_agg(kcu.column_name::text ORDER BY kcu.column_name::text)
         = ARRAY['amount_minor', 'currency', 'product_type', 'region']
  ) THEN
    ALTER TABLE gift_card_denominations
      ADD CONSTRAINT gift_card_denominations_region_currency_amount_type_key
      UNIQUE (region, currency, amount_minor, product_type);
  END IF;
END $$;

-- Index to keep storefront "published, active" catalog reads cheap.
CREATE INDEX IF NOT EXISTS gift_card_denominations_published_idx
  ON gift_card_denominations (product_type)
  WHERE is_published AND active;

-- 6. A pricing policy for a GLOBAL pseudo-region, so non-region-locked NS.gifts
--    products (Steam wallet, etc.) resolve a sale price through the existing
--    gift_card_retail_prices view instead of returning NULL at checkout.
INSERT INTO gift_card_region_pricing_policies
  (region, sale_currency, markup_basis_points, rounding_increment_minor)
VALUES ('GLOBAL', 'RUB', 0, 100)
ON CONFLICT (region) DO NOTHING;
