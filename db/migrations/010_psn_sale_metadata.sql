-- Sale campaign metadata for storefront ordering and badges.

ALTER TABLE psn_regional_products
  ADD COLUMN IF NOT EXISTS sales_rank integer,
  ADD COLUMN IF NOT EXISTS sale_end_date date;

CREATE INDEX IF NOT EXISTS psn_regional_products_sales_rank_idx
  ON psn_regional_products (region, sales_rank)
  WHERE sales_rank IS NOT NULL;

CREATE INDEX IF NOT EXISTS psn_regional_products_sale_end_date_idx
  ON psn_regional_products (region, sale_end_date)
  WHERE sale_end_date IS NOT NULL;
