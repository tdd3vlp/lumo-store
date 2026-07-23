// Entities & value objects for the digital-goods access journal
// (digital_access_log). Pure types — safe to import from client or server.

/** Every audit event the system records. */
export const AUDIT_EVENTS = [
  "ORDER_PAID",
  "CODE_PAGE_OPENED",
  "WARNING_ACCEPTED",
  "CODE_REVEALED",
  "CODE_COPIED",
  "CODE_REOPENED",
  "PAGE_CLOSED",
] as const;
export type AuditEventType = (typeof AUDIT_EVENTS)[number];

/**
 * Events a browser is allowed to self-report via the telemetry endpoint. The
 * authoritative events (ORDER_PAID, WARNING_ACCEPTED, CODE_REVEALED,
 * CODE_REOPENED) are written server-side only and can never be spoofed here.
 */
export const CLIENT_REPORTABLE_EVENTS = [
  "CODE_PAGE_OPENED",
  "CODE_COPIED",
  "PAGE_CLOSED",
] as const;
export type ClientReportableEvent = (typeof CLIENT_REPORTABLE_EVENTS)[number];

export function isClientReportableEvent(
  value: unknown,
): value is ClientReportableEvent {
  return (
    typeof value === "string" &&
    (CLIENT_REPORTABLE_EVENTS as readonly string[]).includes(value)
  );
}

/** Browser-collected signals, sent from the client in the request body. */
export type ClientSignals = {
  timezone: string | null;
  screenResolution: string | null;
  platform: string | null;
  deviceMemory: string | null;
  hardwareConcurrency: number | null;
  browserFingerprint: string | null;
  sessionId: string | null;
};

/** Request-derived signals, read server-side from proxy/browser headers. */
export type RequestContext = {
  ip: string | null;
  userAgent: string | null;
  referer: string | null;
  acceptLanguage: string | null;
};

/** What was accessed. */
export type AuditRefs = {
  orderId?: string | null;
  orderItemId?: string | null;
  customerId?: string | null;
  /** denomination_id (the product/SKU). */
  productId?: string | null;
  /** gift_card_inventory id (the individual code). */
  codeId?: string | null;
};

/** A single event to append to the journal (chain fields are added on write). */
export type AuditEventInput = {
  eventType: AuditEventType;
  /** Idempotency key — a duplicate is a no-op (ON CONFLICT DO NOTHING). */
  eventKey: string;
  occurredAt: Date;
  warningVersion: number | null;
  refs: AuditRefs;
  context: RequestContext;
  signals: ClientSignals;
  /**
   * CONVENTION: payload values must be JSON round-trip stable — strings, null
   * and booleans only. The row_hash is computed from the in-memory object but
   * verified after a jsonb round-trip, so floats / very large numbers / -0 could
   * serialize differently and break verification. Keep numeric context out of
   * here (or stringify it).
   */
  payload?: Record<string, string | boolean | null> | null;
};

/** A persisted journal row, as read back for admin / verification. */
export type DigitalAccessLogRow = {
  id: string;
  seq: number;
  eventType: string;
  orderId: string | null;
  orderItemId: string | null;
  customerId: string | null;
  productId: string | null;
  codeId: string | null;
  warningVersion: number | null;
  ip: string | null;
  userAgent: string | null;
  referer: string | null;
  acceptLanguage: string | null;
  timezone: string | null;
  screenResolution: string | null;
  platform: string | null;
  deviceMemory: string | null;
  hardwareConcurrency: number | null;
  browserFingerprint: string | null;
  sessionId: string | null;
  eventKey: string;
  prevHash: string | null;
  rowHash: string;
  payload: Record<string, unknown> | null;
  occurredAt: string;
  createdAt: string;
  /** Order's human-readable public id — populated by admin list queries only. */
  orderPublicId?: string | null;
};

export const EMPTY_SIGNALS: ClientSignals = {
  timezone: null,
  screenResolution: null,
  platform: null,
  deviceMemory: null,
  hardwareConcurrency: null,
  browserFingerprint: null,
  sessionId: null,
};

/** Request context for server-originated (non-browser) events like ORDER_PAID. */
export const SYSTEM_REQUEST_CONTEXT: RequestContext = {
  ip: null,
  userAgent: null,
  referer: null,
  acceptLanguage: null,
};
