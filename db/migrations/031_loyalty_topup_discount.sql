-- Loyalty program: three spend-based tiers with a per-product-type discount.
-- The top tier gives a smaller cut on wallet top-ups (thinner margin) than on
-- gift cards, so a tier now carries TWO rates: the existing
-- `discount_basis_points` (gift cards / accounts) and a new
-- `topup_discount_basis_points` (Steam / Telegram wallet top-ups).
--
-- Tiers (lifetime spend on fulfilled orders → discount):
--   Базовый  — 0 ₽+       → 0% on everything
--   Серебро  — 10 000 ₽+  → 2% on everything
--   Золото   — 50 000 ₽+  → 5% on cards, 3% on top-ups

ALTER TABLE loyalty_tiers
  ADD COLUMN IF NOT EXISTS topup_discount_basis_points integer NOT NULL DEFAULT 0
    CHECK (topup_discount_basis_points BETWEEN 0 AND 10000);

ALTER TABLE loyalty_accounts
  ADD COLUMN IF NOT EXISTS current_topup_discount_basis_points integer NOT NULL DEFAULT 0
    CHECK (current_topup_discount_basis_points BETWEEN 0 AND 10000);

-- New tiers (base already seeded in migration 002 at 0/0). Idempotent so a
-- re-run doesn't duplicate; keep the discount rates in sync if they change.
INSERT INTO loyalty_tiers (
  code, name, min_lifetime_spend_minor,
  discount_basis_points, topup_discount_basis_points, sort_order
)
VALUES
  ('silver', 'Серебро', 1000000, 200, 200, 1),
  ('gold',   'Золото',  5000000, 500, 300, 2)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  min_lifetime_spend_minor = EXCLUDED.min_lifetime_spend_minor,
  discount_basis_points = EXCLUDED.discount_basis_points,
  topup_discount_basis_points = EXCLUDED.topup_discount_basis_points,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();
