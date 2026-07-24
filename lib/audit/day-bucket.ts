/**
 * Calendar-day bucket (UTC, "YYYY-MM-DD") used inside deterministic event keys
 * for high-frequency audit events. Keying repeated opens / copies / reopens by
 * (item, day) instead of a per-click id collapses reload/re-click spam to at
 * most one journal row per event per item per day (via ON CONFLICT DO NOTHING),
 * while the transfer-of-record events (first CODE_REVEALED, first
 * WARNING_ACCEPTED) keep their exact, non-bucketed keys.
 */
export function dayBucket(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}
