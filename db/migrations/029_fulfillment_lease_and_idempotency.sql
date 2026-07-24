-- Two safety fixes for the payment/fulfilment path.
--
-- 1) Fulfilment lease. fulfillOrder() flips an order to 'fulfilling' while it
--    works. If the process dies mid-flight (deploy restart, OOM, a hung NS.gifts
--    call) the order was stranded in 'fulfilling' forever — no worker and no
--    callback ever reclaimed it, so a paid customer silently got nothing.
--    fulfillment_started_at stamps when the lease was taken; the reconcile
--    worker now re-claims a 'fulfilling' order whose lease is older than a few
--    minutes (fulfillOrder is idempotent, so replay is safe).
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS fulfillment_started_at timestamptz;

CREATE INDEX IF NOT EXISTS orders_fulfilling_lease_idx
  ON orders (fulfillment_started_at)
  WHERE status = 'fulfilling';

-- 2) Per-customer idempotency. The key was globally UNIQUE, so a key chosen by
--    one customer could collide with another customer's order and the upsert
--    would hand back the *other* customer's order id. Scope it to the customer.
ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_idempotency_key_key;

ALTER TABLE orders
  ADD CONSTRAINT orders_customer_idempotency_key
  UNIQUE (customer_id, idempotency_key);
