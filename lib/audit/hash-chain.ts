import { createHmac } from "node:crypto";

// Tamper-evidence for the journal: each row commits (via keyed HMAC) to the
// previous row's hash, so any edit/removal of an earlier row invalidates every
// hash after it.
//
// Threat model: the Postgres instance is shared with the `market` service, so a
// party with raw DB write access could drop the append-only triggers and edit
// rows. A bare SHA-256 chain would be publicly recomputable — they'd just
// rewrite every row_hash and verify-chain would still say OK. Using HMAC keyed
// with AUDIT_CHAIN_HMAC_KEY (held in the app env, NOT in the shared DB) means
// forging a consistent chain requires the secret, not just DB access. Rotating
// the key invalidates historical hashes, so treat it as long-lived. For defence
// against an attacker who also has the app env, periodically anchor the current
// head row_hash externally (verify-chain prints it).
//
// Pure and dependency-free (only node:crypto): the key is injected by callers so
// the chain logic stays unit-testable and re-runnable by the offline verifier
// (scripts/audit/verify-chain.ts).

/** The immutable content a row_hash commits to (seq is intentionally excluded —
 *  it is DB-assigned on insert; ordering is enforced by the prev-hash linkage). */
export type ChainCore = {
  eventType: string;
  eventKey: string;
  /** ISO-8601 UTC. */
  occurredAt: string;
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
  payload: Record<string, unknown> | null;
};

/** Hash of the (non-existent) row before the first — the chain's anchor. */
export const CHAIN_GENESIS = "0".repeat(64);

/** Deterministic serialization: object keys are sorted so hashing is stable. */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    .join(",")}}`;
}

/** Load the HMAC key from the app env (base64 → ≥32 bytes). Not stored in the
 *  shared DB. Called by the repository and the offline verifier. */
export function auditChainKey(): Buffer {
  const encoded = process.env.AUDIT_CHAIN_HMAC_KEY;
  if (!encoded) throw new Error("AUDIT_CHAIN_HMAC_KEY is missing");
  const key = Buffer.from(encoded, "base64");
  if (key.length < 32) {
    throw new Error("AUDIT_CHAIN_HMAC_KEY must decode to at least 32 bytes");
  }
  return key;
}

export function computeRowHash(
  key: Buffer,
  prevHash: string | null,
  core: ChainCore,
): string {
  const base = prevHash ?? CHAIN_GENESIS;
  return createHmac("sha256", key)
    .update(`${base}\n${stableStringify(core)}`)
    .digest("hex");
}

/**
 * Re-walk an ordered (by seq ascending) slice of the chain and confirm each row
 * links to its predecessor and its own row_hash matches its content. Returns the
 * seq of the first broken row, or null if the whole slice is intact.
 *
 * Pass `expectedAnchor` when the rows are a FULL scan from the very start
 * (verify-chain reads the whole table): the first row must then link to that
 * anchor (CHAIN_GENESIS). Without it, deleting the first K rows leaves an
 * internally-consistent tail that would otherwise pass — the head-truncation
 * attack. Omit it only when intentionally verifying a mid-chain slice.
 */
export function verifyChain(
  key: Buffer,
  rows: Array<{ seq: number; prevHash: string | null; rowHash: string; core: ChainCore }>,
  options: { expectedAnchor?: string | null } = {},
): { ok: boolean; brokenSeq: number | null } {
  const checkAnchor = "expectedAnchor" in options;
  let expectedPrev: string | undefined = checkAnchor
    ? (options.expectedAnchor ?? CHAIN_GENESIS)
    : undefined;
  for (const row of rows) {
    if (expectedPrev !== undefined) {
      const linkedTo = row.prevHash ?? CHAIN_GENESIS;
      if (linkedTo !== expectedPrev) return { ok: false, brokenSeq: row.seq };
    }
    if (computeRowHash(key, row.prevHash, row.core) !== row.rowHash) {
      return { ok: false, brokenSeq: row.seq };
    }
    expectedPrev = row.rowHash;
  }
  return { ok: true, brokenSeq: null };
}
