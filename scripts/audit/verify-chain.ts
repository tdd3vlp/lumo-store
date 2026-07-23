import "../env";
import postgres from "postgres";
import {
  auditChainKey,
  CHAIN_GENESIS,
  type ChainCore,
  verifyChain,
} from "../../lib/audit/hash-chain";

// Offline integrity check for the digital_access_log hash-chain. Re-walks every
// row in seq order and confirms each links to its predecessor and its stored
// row_hash matches its content. Exit code 1 if the chain is broken (a row was
// edited/removed despite the append-only trigger — e.g. via direct DB access).
//
// The ChainCore field selection below MUST mirror repository.coreOf.

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is missing");

const sql = postgres(databaseUrl, { max: 1, prepare: false });

const rows = await sql`SELECT * FROM digital_access_log ORDER BY seq ASC`;

const s = (v: unknown): string | null => (v === null || v === undefined ? null : String(v));
const n = (v: unknown): number | null =>
  v === null || v === undefined ? null : Number(v);

const mapped = rows.map((r) => ({
  seq: Number(r.seq),
  prevHash: s(r.prev_hash),
  rowHash: String(r.row_hash),
  core: {
    eventType: String(r.event_type),
    eventKey: String(r.event_key),
    // postgres.js returns timestamptz as a JS Date; occurred_at is always
    // written from a JS Date (ms), so this reproduces the exact ISO string that
    // was hashed at write time. A µs-precision write would break verification.
    occurredAt: new Date(r.occurred_at as string | Date).toISOString(),
    orderId: s(r.order_id),
    orderItemId: s(r.order_item_id),
    customerId: s(r.customer_id),
    productId: s(r.product_id),
    codeId: s(r.code_id),
    warningVersion: n(r.warning_version),
    ip: s(r.ip),
    userAgent: s(r.user_agent),
    referer: s(r.referer),
    acceptLanguage: s(r.accept_language),
    timezone: s(r.timezone),
    screenResolution: s(r.screen_resolution),
    platform: s(r.platform),
    deviceMemory: s(r.device_memory),
    hardwareConcurrency: n(r.hardware_concurrency),
    browserFingerprint: s(r.browser_fingerprint),
    sessionId: s(r.session_id),
    payload: (r.payload as Record<string, unknown> | null) ?? null,
  } satisfies ChainCore,
}));

// Full-table scan: the first row MUST link to genesis, otherwise early rows
// were truncated (head-truncation attack).
const stamp = new Date().toISOString();
const result = verifyChain(auditChainKey(), mapped, {
  expectedAnchor: CHAIN_GENESIS,
});
if (result.ok) {
  const head = mapped.at(-1);
  // Head hash — this line is the external anchor: recorded off-DB (nightly
  // systemd timer → /var/log/lumo/audit-anchor.log, ideally copied offsite) it
  // also detects a future rewrite by someone who holds the app env (see the
  // hash-chain threat model).
  const headStr = head
    ? ` head seq=${head.seq} row_hash=${head.rowHash}`
    : "";
  console.log(`${stamp} OK — ${mapped.length} rows, hash-chain intact.${headStr}`);
} else {
  console.error(`${stamp} BROKEN — chain fails at seq ${result.brokenSeq}`);
  process.exitCode = 1;
}

await sql.end();
