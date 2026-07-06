ALTER TABLE regional_pricing_rates
  ADD COLUMN IF NOT EXISTS card_coefficient_bps integer NOT NULL DEFAULT 10000
    CHECK (card_coefficient_bps > 0);

UPDATE regional_pricing_rates SET card_coefficient_bps = 15000 WHERE region = 'IN';
UPDATE regional_pricing_rates SET card_coefficient_bps = 25000 WHERE region = 'TR';
