ALTER TABLE psn_regional_products
  ADD COLUMN IF NOT EXISTS screenshot_urls text[] NOT NULL DEFAULT '{}';
