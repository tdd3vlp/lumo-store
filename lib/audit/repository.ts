import "server-only";
import { sql } from "@/lib/db";
import { auditChainKey, type ChainCore, computeRowHash } from "./hash-chain";
import type {
  AppendResult,
  AuditLogQuery,
  AuditRepository,
  SqlExecutor,
} from "./interfaces";
import type { AuditEventInput, DigitalAccessLogRow } from "./types";

// Serializes hash-chain writes: only one appender may read the chain head and
// insert the next link at a time. Transaction-scoped, so it's held for the whole
// enclosing tx (e.g. a reveal that writes several rows) and auto-released on
// commit/rollback. Any fixed application-chosen key works.
const CHAIN_LOCK_KEY = 748213905;

// Row caps for the admin view. The SSR page and the "Обновить" fetch share
// ADMIN_LOG_LIMIT so the on-screen "Событий" count doesn't jump; JSON export
// allows more.
export const ADMIN_LOG_LIMIT = 1000;
export const ADMIN_LOG_EXPORT_LIMIT = 5000;

function mapRow(row: Record<string, unknown>): DigitalAccessLogRow {
  return {
    id: String(row.id),
    seq: Number(row.seq),
    eventType: String(row.event_type),
    orderId: row.order_id === null ? null : String(row.order_id),
    orderItemId: row.order_item_id === null ? null : String(row.order_item_id),
    customerId: row.customer_id === null ? null : String(row.customer_id),
    productId: row.product_id === null ? null : String(row.product_id),
    codeId: row.code_id === null ? null : String(row.code_id),
    warningVersion:
      row.warning_version === null ? null : Number(row.warning_version),
    ip: row.ip === null ? null : String(row.ip),
    userAgent: row.user_agent === null ? null : String(row.user_agent),
    referer: row.referer === null ? null : String(row.referer),
    acceptLanguage:
      row.accept_language === null ? null : String(row.accept_language),
    timezone: row.timezone === null ? null : String(row.timezone),
    screenResolution:
      row.screen_resolution === null ? null : String(row.screen_resolution),
    platform: row.platform === null ? null : String(row.platform),
    deviceMemory: row.device_memory === null ? null : String(row.device_memory),
    hardwareConcurrency:
      row.hardware_concurrency === null
        ? null
        : Number(row.hardware_concurrency),
    browserFingerprint:
      row.browser_fingerprint === null
        ? null
        : String(row.browser_fingerprint),
    sessionId: row.session_id === null ? null : String(row.session_id),
    eventKey: String(row.event_key),
    prevHash: row.prev_hash === null ? null : String(row.prev_hash),
    rowHash: String(row.row_hash),
    payload: (row.payload as Record<string, unknown> | null) ?? null,
    // postgres.js returns timestamptz as a JS Date. INVARIANT: occurred_at is
    // always written from a JS Date (ms precision), so this round-trips exactly —
    // if a µs-precision value were ever written directly, the ISO string here
    // would differ from the one hashed and break chain verification.
    occurredAt: new Date(row.occurred_at as string | Date).toISOString(),
    createdAt: new Date(row.created_at as string | Date).toISOString(),
    orderPublicId:
      row.order_public_id === undefined || row.order_public_id === null
        ? null
        : String(row.order_public_id),
  };
}

function coreOf(input: AuditEventInput, occurredAtIso: string): ChainCore {
  return {
    eventType: input.eventType,
    eventKey: input.eventKey,
    occurredAt: occurredAtIso,
    orderId: input.refs.orderId ?? null,
    orderItemId: input.refs.orderItemId ?? null,
    customerId: input.refs.customerId ?? null,
    productId: input.refs.productId ?? null,
    codeId: input.refs.codeId ?? null,
    warningVersion: input.warningVersion ?? null,
    ip: input.context.ip,
    userAgent: input.context.userAgent,
    referer: input.context.referer,
    acceptLanguage: input.context.acceptLanguage,
    timezone: input.signals.timezone,
    screenResolution: input.signals.screenResolution,
    platform: input.signals.platform,
    deviceMemory: input.signals.deviceMemory,
    hardwareConcurrency: input.signals.hardwareConcurrency,
    browserFingerprint: input.signals.browserFingerprint,
    sessionId: input.signals.sessionId,
    payload: input.payload ?? null,
  };
}

async function appendIn(
  db: SqlExecutor,
  input: AuditEventInput,
): Promise<AppendResult> {
  // Serialize with peers, then read the current head to chain onto.
  await db`SELECT pg_advisory_xact_lock(${CHAIN_LOCK_KEY})`;
  const [head] = await db`
    SELECT row_hash FROM digital_access_log ORDER BY seq DESC LIMIT 1
  `;
  const prevHash = head ? String(head.row_hash) : null;

  const occurredAtIso = input.occurredAt.toISOString();
  const rowHash = computeRowHash(
    auditChainKey(),
    prevHash,
    coreOf(input, occurredAtIso),
  );

  const [row] = await db`
    INSERT INTO digital_access_log (
      event_type, event_key, occurred_at,
      order_id, order_item_id, customer_id, product_id, code_id,
      warning_version,
      ip, user_agent, referer, accept_language,
      timezone, screen_resolution, platform, device_memory,
      hardware_concurrency, browser_fingerprint, session_id,
      payload, prev_hash, row_hash
    ) VALUES (
      ${input.eventType}, ${input.eventKey}, ${input.occurredAt},
      ${input.refs.orderId ?? null}, ${input.refs.orderItemId ?? null},
      ${input.refs.customerId ?? null}, ${input.refs.productId ?? null},
      ${input.refs.codeId ?? null},
      ${input.warningVersion ?? null},
      ${input.context.ip}, ${input.context.userAgent},
      ${input.context.referer}, ${input.context.acceptLanguage},
      ${input.signals.timezone}, ${input.signals.screenResolution},
      ${input.signals.platform}, ${input.signals.deviceMemory},
      ${input.signals.hardwareConcurrency}, ${input.signals.browserFingerprint},
      ${input.signals.sessionId},
      ${input.payload ? sql.json(input.payload as never) : null}, ${prevHash}, ${rowHash}
    )
    ON CONFLICT (event_key) DO NOTHING
    RETURNING *
  `;

  if (!row) return { inserted: false, row: null };
  return { inserted: true, row: mapRow(row) };
}

export const auditRepository: AuditRepository = {
  async append(input, db) {
    if (db) return appendIn(db, input);
    return sql.begin((tx) => appendIn(tx, input));
  },

  async revealedCodeIds(orderItemId, db = sql) {
    const rows = await db`
      SELECT DISTINCT code_id FROM digital_access_log
      WHERE order_item_id = ${orderItemId}
        AND event_type = 'CODE_REVEALED'
        AND code_id IS NOT NULL
    `;
    return new Set(rows.map((row) => String(row.code_id)));
  },

  async list(query: AuditLogQuery) {
    const limit = Math.min(
      Math.max(query.limit ?? ADMIN_LOG_LIMIT, 1),
      ADMIN_LOG_EXPORT_LIMIT,
    );
    const rows = await sql`
      SELECT log.*, orders.public_id AS order_public_id
      FROM digital_access_log log
      LEFT JOIN orders ON orders.id = log.order_id
      WHERE true
        ${query.orderId ? sql`AND log.order_id = ${query.orderId}` : sql``}
        ${query.customerId ? sql`AND log.customer_id = ${query.customerId}` : sql``}
        ${query.orderItemId ? sql`AND log.order_item_id = ${query.orderItemId}` : sql``}
        ${query.orderPublicId ? sql`AND orders.public_id ILIKE ${`%${query.orderPublicId}%`}` : sql``}
      ORDER BY log.seq DESC
      LIMIT ${limit}
    `;
    return rows.map(mapRow);
  },
};
