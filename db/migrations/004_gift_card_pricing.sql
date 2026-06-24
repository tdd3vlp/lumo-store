CREATE TABLE gift_card_region_pricing_policies (
  region text PRIMARY KEY,
  sale_currency char(3) NOT NULL DEFAULT 'RUB',
  markup_basis_points integer NOT NULL DEFAULT 0
    CHECK (markup_basis_points BETWEEN 0 AND 100000),
  rounding_increment_minor integer NOT NULL DEFAULT 100
    CHECK (rounding_increment_minor > 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE gift_card_procurement_prices (
  denomination_id uuid PRIMARY KEY
    REFERENCES gift_card_denominations(id) ON DELETE CASCADE,
  purchase_cost_minor integer
    CHECK (purchase_cost_minor IS NULL OR purchase_cost_minor >= 0),
  sale_price_override_minor integer
    CHECK (
      sale_price_override_minor IS NULL
      OR sale_price_override_minor >= 0
    ),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO gift_card_region_pricing_policies (
  region,
  sale_currency,
  markup_basis_points,
  rounding_increment_minor
)
VALUES
  ('IN', 'RUB', 0, 100),
  ('TR', 'RUB', 0, 100)
ON CONFLICT (region) DO NOTHING;

INSERT INTO gift_card_denominations (region, currency, amount_minor)
VALUES
  ('IN', 'INR', 100000),
  ('IN', 'INR', 200000),
  ('IN', 'INR', 300000),
  ('IN', 'INR', 400000),
  ('IN', 'INR', 500000),
  ('IN', 'INR', 700000),
  ('IN', 'INR', 800000),
  ('IN', 'INR', 900000),
  ('IN', 'INR', 1200000)
ON CONFLICT (region, currency, amount_minor) DO NOTHING;

CREATE VIEW gift_card_retail_prices AS
SELECT
  denominations.id,
  denominations.region,
  denominations.currency,
  denominations.amount_minor,
  denominations.active,
  policies.sale_currency,
  procurement.purchase_cost_minor,
  policies.markup_basis_points,
  procurement.sale_price_override_minor,
  CASE
    WHEN procurement.sale_price_override_minor IS NOT NULL
      THEN procurement.sale_price_override_minor
    WHEN procurement.purchase_cost_minor IS NOT NULL
      THEN (
        CEIL(
          (
            procurement.purchase_cost_minor
            * (10000 + policies.markup_basis_points)::numeric
            / 10000
          ) / policies.rounding_increment_minor
        ) * policies.rounding_increment_minor
      )::integer
    ELSE NULL
  END AS sale_price_minor
FROM gift_card_denominations denominations
JOIN gift_card_region_pricing_policies policies
  ON policies.region = denominations.region
LEFT JOIN gift_card_procurement_prices procurement
  ON procurement.denomination_id = denominations.id;

