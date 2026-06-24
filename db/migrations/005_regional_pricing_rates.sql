CREATE TABLE regional_pricing_rates (
  region text PRIMARY KEY,
  currency text NOT NULL,
  rub_minor_per_unit integer NOT NULL CHECK (rub_minor_per_unit > 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO regional_pricing_rates (region, currency, rub_minor_per_unit)
VALUES
  ('IN', 'INR', 125),
  ('TR', 'TRY', 225)
ON CONFLICT (region) DO NOTHING;
