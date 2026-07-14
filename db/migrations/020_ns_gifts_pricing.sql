-- Dynamic USD-based pricing for NS.gifts-sourced products.
--
-- NS.gifts quotes wholesale cost in USD. Instead of baking a fixed ruble retail
-- price into each denomination, we store the USD cost and derive the ruble
-- retail price on the fly from a global USD->RUB rate + markup kept in
-- app_settings. Changing the rate in the admin instantly re-prices the whole
-- NS.gifts catalog with no per-row rewrite.

ALTER TABLE gift_card_denominations
  ADD COLUMN IF NOT EXISTS cost_usd numeric;

CREATE TABLE IF NOT EXISTS app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- USD->RUB rate (rubles per 1 USD) and markup in basis points (2500 = 25%).
INSERT INTO app_settings (key, value) VALUES
  ('ns_usd_rub_rate', '81'),
  ('ns_markup_bps', '2500')
ON CONFLICT (key) DO NOTHING;
