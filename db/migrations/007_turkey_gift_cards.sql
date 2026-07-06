-- Turkish PlayStation Store gift card denominations (TRY).
-- amount_minor = TRY major × 100.
INSERT INTO gift_card_denominations (region, currency, amount_minor)
VALUES
  ('TR', 'TRY',  25000),
  ('TR', 'TRY',  50000),
  ('TR', 'TRY',  75000),
  ('TR', 'TRY', 100000),
  ('TR', 'TRY', 150000),
  ('TR', 'TRY', 200000),
  ('TR', 'TRY', 250000),
  ('TR', 'TRY', 300000),
  ('TR', 'TRY', 400000),
  ('TR', 'TRY', 500000)
ON CONFLICT (region, currency, amount_minor) DO NOTHING;
