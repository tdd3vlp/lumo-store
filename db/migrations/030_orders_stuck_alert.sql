-- Silent-stall alerting. The fulfilment worker fires a Telegram alert for an
-- order that has sat too long in a state it should have left (paid but not
-- fulfilled, a stale 'fulfilling' lease, or parked in manual_review). This
-- column records when that alert was sent so each stuck order is reported
-- exactly once, not every worker tick.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS stuck_alerted_at timestamptz;

-- Partial index over the not-yet-alerted rows the worker scans each tick.
CREATE INDEX IF NOT EXISTS orders_stuck_unalerted_idx
  ON orders (status)
  WHERE stuck_alerted_at IS NULL;
