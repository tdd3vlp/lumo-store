import type postgres from "postgres";
import type {
  AuditEventInput,
  AuditEventType,
  AuditRefs,
  ClientSignals,
  DigitalAccessLogRow,
  RequestContext,
} from "./types";

// A postgres.js executor: either the pooled `sql` client (Sql) or a `tx` handed
// in by `sql.begin(...)` (TransactionSql). Both extend ISql — the shared query
// surface — so a repository method can accept either and an audit write can join
// the same transaction as the reveal (journal-first, code-second).
export type SqlExecutor = postgres.ISql;

export type AppendResult = {
  /** false when an idempotent duplicate (same event_key) was skipped. */
  inserted: boolean;
  row: DigitalAccessLogRow | null;
};

export interface AuditRepository {
  /** Append one event, hash-chained. Runs inside `db` if given, else opens its
   *  own transaction. Idempotent on event_key. */
  append(input: AuditEventInput, db?: SqlExecutor): Promise<AppendResult>;

  /** code_ids for this item that already have a CODE_REVEALED row, so each code's
   *  own first reveal is recorded as CODE_REVEALED (not CODE_REOPENED). */
  revealedCodeIds(orderItemId: string, db?: SqlExecutor): Promise<Set<string>>;

  /** Newest-first journal rows for the admin view / export. */
  list(query: AuditLogQuery): Promise<DigitalAccessLogRow[]>;
}

export type AuditLogQuery = {
  orderId?: string;
  customerId?: string;
  orderItemId?: string;
  /** Substring match on the order's human-readable public id (admin filter). */
  orderPublicId?: string;
  limit?: number;
};

export interface AuditService {
  /** Assemble context + signals and append a single event. */
  record(
    eventType: AuditEventType,
    args: {
      eventKey: string;
      refs: AuditRefs;
      context: RequestContext;
      signals: ClientSignals;
      warningVersion?: number | null;
      /** JSON round-trip-stable values only — see AuditEventInput.payload. */
      payload?: Record<string, string | boolean | null> | null;
      occurredAt?: Date;
    },
    db?: SqlExecutor,
  ): Promise<AppendResult>;
}
