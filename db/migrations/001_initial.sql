CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE gift_card_status AS ENUM (
  'available',
  'reserved',
  'delivered',
  'disabled'
);

CREATE TYPE order_status AS ENUM (
  'pending',
  'paid',
  'fulfilling',
  'fulfilled',
  'cancelled',
  'refunded',
  'manual_review'
);

CREATE TYPE payment_status AS ENUM (
  'pending',
  'succeeded',
  'failed',
  'refunded'
);

CREATE TYPE outbox_status AS ENUM (
  'pending',
  'processing',
  'sent',
  'retry',
  'failed'
);

CREATE TABLE IF NOT EXISTS schema_migrations (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE catalog_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_file text NOT NULL,
  source_collection text NOT NULL,
  checksum_sha256 text NOT NULL UNIQUE,
  imported_rows integer NOT NULL DEFAULT 0,
  skipped_rows integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE catalog_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  indian_psn_id text NOT NULL UNIQUE,
  title text NOT NULL,
  normalized_title text NOT NULL,
  description_original text,
  image_url text,
  ps_store_url_in text,
  platform text,
  release_date date,
  publisher text,
  genres text,
  russian_voice boolean,
  russian_subtitles boolean,
  english_voice boolean,
  english_subtitles boolean,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX catalog_products_normalized_title_idx
  ON catalog_products (normalized_title);

CREATE TABLE catalog_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id uuid NOT NULL REFERENCES catalog_imports(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES catalog_products(id) ON DELETE CASCADE,
  collection text NOT NULL,
  price_minor integer,
  original_price_minor integer,
  currency char(3) NOT NULL DEFAULT 'INR',
  available boolean NOT NULL DEFAULT true,
  raw_row jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (import_id, product_id)
);

CREATE INDEX catalog_offers_collection_idx
  ON catalog_offers (collection, created_at DESC);

CREATE TABLE gift_card_denominations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region text NOT NULL,
  currency char(3) NOT NULL,
  amount_minor integer NOT NULL CHECK (amount_minor > 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (region, currency, amount_minor)
);

CREATE TABLE gift_card_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  denomination_id uuid NOT NULL
    REFERENCES gift_card_denominations(id) ON DELETE RESTRICT,
  code_ciphertext bytea NOT NULL,
  code_iv bytea NOT NULL,
  code_auth_tag bytea NOT NULL,
  code_fingerprint text NOT NULL UNIQUE,
  status gift_card_status NOT NULL DEFAULT 'available',
  supplier_reference text,
  cost_minor integer,
  reserved_order_item_id uuid,
  reserved_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX gift_card_inventory_available_idx
  ON gift_card_inventory (denomination_id, created_at)
  WHERE status = 'available';

CREATE TABLE customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  email_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id text NOT NULL UNIQUE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  status order_status NOT NULL DEFAULT 'pending',
  currency char(3) NOT NULL,
  total_minor integer NOT NULL CHECK (total_minor >= 0),
  idempotency_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  fulfilled_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  item_type text NOT NULL CHECK (item_type IN ('gift_card')),
  denomination_id uuid REFERENCES gift_card_denominations(id) ON DELETE RESTRICT,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price_minor integer NOT NULL CHECK (unit_price_minor >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE gift_card_inventory
  ADD CONSTRAINT gift_card_inventory_reserved_order_item_fk
  FOREIGN KEY (reserved_order_item_id)
  REFERENCES order_items(id)
  ON DELETE RESTRICT;

CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  provider text NOT NULL,
  provider_payment_id text NOT NULL,
  status payment_status NOT NULL DEFAULT 'pending',
  amount_minor integer NOT NULL,
  currency char(3) NOT NULL,
  raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_payment_id)
);

CREATE TABLE fulfillment_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id uuid NOT NULL REFERENCES order_items(id) ON DELETE RESTRICT,
  gift_card_id uuid NOT NULL REFERENCES gift_card_inventory(id) ON DELETE RESTRICT,
  recipient_email text NOT NULL,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_item_id, gift_card_id)
);

CREATE TABLE email_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key text NOT NULL UNIQUE,
  template text NOT NULL,
  recipient_email text NOT NULL,
  payload jsonb NOT NULL,
  status outbox_status NOT NULL DEFAULT 'pending',
  attempts smallint NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX email_outbox_worker_idx
  ON email_outbox (status, next_attempt_at, created_at);
