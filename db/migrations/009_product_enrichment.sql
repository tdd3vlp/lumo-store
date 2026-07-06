-- Product detail enrichment fields: genres, star rating, ratings count.
-- voice_languages / subtitle_languages / publisher / release_date already exist.

ALTER TABLE psn_regional_products
  ADD COLUMN IF NOT EXISTS genres        text[]         NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS rating        numeric(4,2),
  ADD COLUMN IF NOT EXISTS ratings_count integer;

CREATE INDEX IF NOT EXISTS psn_regional_products_genre_idx
  ON psn_regional_products USING GIN (genres);
