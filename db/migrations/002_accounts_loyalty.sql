CREATE TABLE customer_profiles (
  customer_id uuid PRIMARY KEY REFERENCES customers(id) ON DELETE CASCADE,
  display_name text,
  phone text,
  locale text NOT NULL DEFAULT 'ru',
  marketing_consent boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE auth_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_subject text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz,
  UNIQUE (provider, provider_subject)
);

CREATE INDEX auth_identities_customer_idx
  ON auth_identities (customer_id);

CREATE TABLE loyalty_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  min_lifetime_spend_minor bigint NOT NULL DEFAULT 0
    CHECK (min_lifetime_spend_minor >= 0),
  discount_basis_points integer NOT NULL DEFAULT 0
    CHECK (discount_basis_points BETWEEN 0 AND 10000),
  active boolean NOT NULL DEFAULT true,
  sort_order smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO loyalty_tiers (
  code,
  name,
  min_lifetime_spend_minor,
  discount_basis_points,
  sort_order
)
VALUES ('base', 'Базовый', 0, 0, 0);

CREATE TABLE loyalty_accounts (
  customer_id uuid PRIMARY KEY REFERENCES customers(id) ON DELETE CASCADE,
  tier_id uuid NOT NULL REFERENCES loyalty_tiers(id) ON DELETE RESTRICT,
  lifetime_spend_minor bigint NOT NULL DEFAULT 0
    CHECK (lifetime_spend_minor >= 0),
  current_discount_basis_points integer NOT NULL DEFAULT 0
    CHECK (current_discount_basis_points BETWEEN 0 AND 10000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TYPE loyalty_ledger_event AS ENUM (
  'order_fulfilled',
  'refund',
  'manual_adjustment'
);

CREATE TABLE loyalty_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  order_id uuid REFERENCES orders(id) ON DELETE RESTRICT,
  event_type loyalty_ledger_event NOT NULL,
  spend_delta_minor bigint NOT NULL,
  balance_after_minor bigint NOT NULL CHECK (balance_after_minor >= 0),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, event_type)
);

CREATE INDEX loyalty_ledger_customer_idx
  ON loyalty_ledger (customer_id, created_at DESC);

ALTER TABLE gift_card_denominations
  ADD COLUMN loyalty_discount_eligible boolean NOT NULL DEFAULT true;

ALTER TABLE orders
  ADD COLUMN subtotal_minor integer,
  ADD COLUMN discount_minor integer NOT NULL DEFAULT 0,
  ADD COLUMN loyalty_discount_basis_points integer NOT NULL DEFAULT 0,
  ADD COLUMN loyalty_tier_code text;

UPDATE orders SET subtotal_minor = total_minor WHERE subtotal_minor IS NULL;

ALTER TABLE orders
  ALTER COLUMN subtotal_minor SET NOT NULL,
  ADD CONSTRAINT orders_subtotal_non_negative CHECK (subtotal_minor >= 0),
  ADD CONSTRAINT orders_discount_non_negative CHECK (discount_minor >= 0),
  ADD CONSTRAINT orders_discount_not_above_subtotal
    CHECK (discount_minor <= subtotal_minor),
  ADD CONSTRAINT orders_loyalty_discount_range
    CHECK (loyalty_discount_basis_points BETWEEN 0 AND 10000);

INSERT INTO loyalty_accounts (
  customer_id,
  tier_id,
  lifetime_spend_minor,
  current_discount_basis_points
)
SELECT customers.id, tiers.id, 0, tiers.discount_basis_points
FROM customers
CROSS JOIN loyalty_tiers tiers
WHERE tiers.code = 'base'
ON CONFLICT (customer_id) DO NOTHING;

