-- Per-line fulfilment tracking so the fulfilment engine is idempotent and
-- resumable (a paid order can be retried by a worker without double-delivering
-- or double-buying from NS.gifts).
--
-- ns_custom_id: the deterministic NS.gifts order id used when a gift-card line
-- has to be bought on demand (local stock short). Reusing it lets a retry
-- recover the same NS.gifts order instead of paying twice.

ALTER TABLE order_items
  ADD COLUMN fulfillment_status text NOT NULL DEFAULT 'pending'
    CHECK (fulfillment_status IN ('pending', 'fulfilled', 'failed')),
  ADD COLUMN ns_custom_id text,
  ADD COLUMN fulfilled_at timestamptz;
