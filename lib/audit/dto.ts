import type { ClientReportableEvent, ClientSignals } from "./types";

// Wire DTOs for the reveal + telemetry endpoints. The client sends its collected
// signals plus an idempotency token; the server merges these with header-derived
// context. Codes travel ONLY in RevealResponse.codes (the on-demand fetch body).

// `signals` carries the browser-collected values including `sessionId` (a
// per-page-load id kept in memory only — never persisted client-side).

export type RevealRequest = {
  orderItemId: string;
  acceptedWarning: boolean;
  warningVersion: number;
  /** Client-generated uuid for this action — idempotency + double-submit guard. */
  clientEventId: string;
  signals: Partial<ClientSignals>;
};

export type RevealResponse =
  | { ok: true; codes: string[]; firstReveal: boolean }
  | { error: string };

export type AuditEventRequest = {
  eventType: ClientReportableEvent;
  orderItemId?: string;
  clientEventId: string;
  signals: Partial<ClientSignals>;
};
