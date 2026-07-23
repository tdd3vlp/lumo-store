-- "Аккаунты PlayStation" product inventory. Each row is one ready-to-sell
-- account whose credentials (email, password, 2FA, birthdate) are stored
-- encrypted at rest (AES-256-GCM, GIFT_CARD_ENCRYPTION_KEY) as a single JSON
-- blob — same scheme as gift_card_inventory codes. Held until delivered to a
-- customer; region matches the account's PSN region.

CREATE TYPE ps_account_status AS ENUM ('available', 'reserved', 'delivered');

CREATE TABLE ps_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region text NOT NULL,
  data_ciphertext bytea NOT NULL,
  data_iv bytea NOT NULL,
  data_auth_tag bytea NOT NULL,
  status ps_account_status NOT NULL DEFAULT 'available',
  reserved_order_item_id uuid,
  reserved_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ps_accounts_available_idx
  ON ps_accounts (region, created_at)
  WHERE status = 'available';
