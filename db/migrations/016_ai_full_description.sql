-- Cleaned, editorial-style 2-paragraph AI description for the game's "About"
-- section, distinct from the raw PS Store text (which is full of platform/
-- edition boilerplate) and from the short storefront summary.
ALTER TABLE psn_regional_products
  ADD COLUMN IF NOT EXISTS description_ai_full_ru text;
