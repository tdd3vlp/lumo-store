import "server-only";
import type { AppendResult, AuditService, SqlExecutor } from "./interfaces";
import { auditRepository } from "./repository";
import type {
  AuditEventType,
  AuditRefs,
  ClientSignals,
  RequestContext,
} from "./types";

// Thin orchestration over the repository: assembles the event and delegates the
// hash-chained, idempotent append. Kept separate from the repository so callers
// depend on the AuditService abstraction (DIP), and so the "record an event"
// concern stays free of SQL.

export const auditService: AuditService = {
  async record(
    eventType: AuditEventType,
    args: {
      eventKey: string;
      refs: AuditRefs;
      context: RequestContext;
      signals: ClientSignals;
      warningVersion?: number | null;
      payload?: Record<string, string | boolean | null> | null;
      occurredAt?: Date;
    },
    db?: SqlExecutor,
  ): Promise<AppendResult> {
    return auditRepository.append(
      {
        eventType,
        eventKey: args.eventKey,
        occurredAt: args.occurredAt ?? new Date(),
        warningVersion: args.warningVersion ?? null,
        refs: args.refs,
        context: args.context,
        signals: args.signals,
        payload: args.payload ?? null,
      },
      db,
    );
  },
};
