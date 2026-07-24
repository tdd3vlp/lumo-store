-- Security audit journal for digital-goods delivery.
--
-- Every step of a customer accessing a purchased digital code is recorded here:
-- ORDER_PAID, CODE_PAGE_OPENED, WARNING_ACCEPTED, CODE_REVEALED, CODE_COPIED,
-- CODE_REOPENED, PAGE_CLOSED. The FIRST successful CODE_REVEALED (after the
-- customer accepts the warning) is the official moment of digital-goods
-- transfer, so this table must be tamper-evident and append-only:
--
--   * hash-chain — each row stores prev_hash (the previous row's row_hash) and
--     its own row_hash = HMAC-SHA256(key, prev_hash || canonical(content)),
--     where `key` = AUDIT_CHAIN_HMAC_KEY lives in the app env, NOT in this DB.
--     Editing or deleting any earlier row invalidates every hash after it, and
--     because the HMAC is keyed, a party with only DB access (this DB is SHARED
--     with the `market` service) cannot recompute a consistent chain — forging
--     one requires the secret. See lib/audit/hash-chain.ts for the threat model.
--   * append-only — triggers block UPDATE, DELETE and TRUNCATE at the DB level,
--     so the journal can't be rewritten even by a buggy or malicious query.
--
-- Written defensively (IF NOT EXISTS / OR REPLACE / DROP IF EXISTS) because this
-- Postgres instance is shared with the sibling `market` service.

CREATE TABLE IF NOT EXISTS digital_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seq bigint GENERATED ALWAYS AS IDENTITY,
  event_type text NOT NULL,
  event_key text NOT NULL UNIQUE,
  occurred_at timestamptz NOT NULL,

  -- What was accessed (all nullable: system events carry no item/code).
  order_id uuid,
  order_item_id uuid,
  customer_id uuid,
  product_id uuid,           -- gift_card_denominations.id (the SKU)
  code_id uuid,              -- gift_card_inventory.id (the individual code)
  warning_version smallint,

  -- Server-trusted request context.
  ip text,
  user_agent text,
  referer text,
  accept_language text,

  -- Browser-collected signals.
  timezone text,
  screen_resolution text,
  platform text,
  device_memory text,
  hardware_concurrency integer,
  browser_fingerprint text,
  session_id text,

  payload jsonb,

  -- Tamper-evidence chain.
  prev_hash text,
  row_hash text NOT NULL,

  created_at timestamptz NOT NULL DEFAULT now()
);

-- Shared-DB guard: CREATE TABLE IF NOT EXISTS silently accepts a pre-existing
-- table of the same name — if `market` (which shares this DB) ever created a
-- differently-shaped digital_access_log, we must fail loudly rather than run
-- against the wrong schema. Assert the tamper-evidence columns exist.
DO $$
BEGIN
  IF (
    SELECT count(*) FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'digital_access_log'
      AND column_name IN ('row_hash', 'prev_hash', 'event_key', 'seq')
  ) <> 4 THEN
    RAISE EXCEPTION
      'digital_access_log exists with an unexpected schema — refusing to proceed';
  END IF;
END $$;

-- Chain-head lookup: every append reads `ORDER BY seq DESC LIMIT 1` under the
-- advisory lock, so this must be an O(log n) index scan, not a seq scan — the
-- critical section is shared by ALL writers (incl. the payment callback path).
CREATE UNIQUE INDEX IF NOT EXISTS digital_access_log_seq_idx
  ON digital_access_log (seq);

CREATE INDEX IF NOT EXISTS digital_access_log_order_idx
  ON digital_access_log (order_id, seq);
CREATE INDEX IF NOT EXISTS digital_access_log_customer_idx
  ON digital_access_log (customer_id, seq);
CREATE INDEX IF NOT EXISTS digital_access_log_item_idx
  ON digital_access_log (order_item_id, seq);
CREATE INDEX IF NOT EXISTS digital_access_log_occurred_idx
  ON digital_access_log (occurred_at);

-- Append-only enforcement: reject any UPDATE, DELETE or TRUNCATE. The same
-- function serves both triggers (TG_OP names the blocked operation).
CREATE OR REPLACE FUNCTION digital_access_log_no_mutate()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'digital_access_log is append-only (% blocked)', TG_OP;
END;
$$ LANGUAGE plpgsql;

-- Row-level: blocks UPDATE / DELETE.
DROP TRIGGER IF EXISTS digital_access_log_immutable ON digital_access_log;
CREATE TRIGGER digital_access_log_immutable
  BEFORE UPDATE OR DELETE ON digital_access_log
  FOR EACH ROW EXECUTE FUNCTION digital_access_log_no_mutate();

-- Statement-level: blocks TRUNCATE (row triggers don't fire on TRUNCATE, so it
-- would otherwise silently empty the whole journal).
DROP TRIGGER IF EXISTS digital_access_log_no_truncate ON digital_access_log;
CREATE TRIGGER digital_access_log_no_truncate
  BEFORE TRUNCATE ON digital_access_log
  FOR EACH STATEMENT EXECUTE FUNCTION digital_access_log_no_mutate();

-- Neutralise not-yet-picked `gift-card-delivery` rows queued before this change:
-- the code is never emailed. Convert them to the code-free `gift-card-ready`
-- template so they still notify (link to the ЛК) instead of carrying the code.
-- Only 'pending'/'retry' — these are definitively NOT in flight. A 'processing'
-- row is (or was) held by a worker that already read its old payload into memory,
-- so this UPDATE couldn't stop it anyway; that race is closed operationally by
-- quiescing/draining the fulfilment worker before this one-time cutover deploy
-- (after it, `gift-card-delivery` is never enqueued again). Sent/failed rows are
-- left untouched (history).
UPDATE email_outbox
SET template = 'gift-card-ready',
    payload = jsonb_build_object(
      'publicOrderId', payload->'publicOrderId',
      'items', '[]'::jsonb
    ),
    updated_at = now()
WHERE template = 'gift-card-delivery'
  AND status IN ('pending', 'retry');
