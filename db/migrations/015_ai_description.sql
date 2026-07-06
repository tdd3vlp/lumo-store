-- AI-generated description fields for games that have no Russian translation
-- from ru-ua or need a short summary for the storefront.
ALTER TABLE psn_regional_products
  ADD COLUMN IF NOT EXISTS description_ai_ru_text    text,   -- full AI translation when ru-ua not available
  ADD COLUMN IF NOT EXISTS description_ai_summary_ru text;   -- 1-2 sentence storefront summary in Russian
