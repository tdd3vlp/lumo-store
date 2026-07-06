-- Named curated collections (e.g. "Великолепные игры 2026 года").
-- Collections are separate from sale batches: no discount filter required.

CREATE TABLE IF NOT EXISTS psn_collections (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ru    text        NOT NULL,
  region     text        NOT NULL,
  is_active  boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name_ru, region)
);

CREATE TABLE IF NOT EXISTS psn_collection_items (
  collection_id           uuid NOT NULL REFERENCES psn_collections(id)         ON DELETE CASCADE,
  psn_regional_product_id uuid NOT NULL REFERENCES psn_regional_products(id)   ON DELETE CASCADE,
  display_rank            integer NOT NULL DEFAULT 0,
  PRIMARY KEY (collection_id, psn_regional_product_id)
);

CREATE INDEX IF NOT EXISTS psn_collection_items_rank_idx
  ON psn_collection_items (collection_id, display_rank);
