import { cachedSignals, collectSignals } from "./client-signals";
import type { ClientReportableEvent } from "./types";

// Best-effort browser telemetry reporter. Fire-and-forget: audit failures must
// never break the UI. Uses sendBeacon for PAGE_CLOSED so the event survives the
// page unloading.

const ENDPOINT = "/api/account/audit-events";

/** Fresh idempotency token for a single client action. */
export function newEventId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `e-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function reportEvent(
  eventType: ClientReportableEvent,
  orderItemId?: string,
): Promise<void> {
  try {
    const signals = await collectSignals();
    await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType,
        orderItemId,
        clientEventId: newEventId(),
        signals,
      }),
    });
  } catch {
    /* best-effort */
  }
}

/**
 * Synchronous unload-safe variant using the last cached signals + sendBeacon.
 * Pass a stable `clientEventId` for events that must not multiply (e.g.
 * PAGE_CLOSED): the server key is `${eventType}:${sessionId}:${clientEventId}`,
 * so a stable id collapses duplicates for the same page session.
 */
export function reportEventBeacon(
  eventType: ClientReportableEvent,
  orderItemId?: string,
  clientEventId?: string,
): void {
  try {
    const body = JSON.stringify({
      eventType,
      orderItemId,
      clientEventId: clientEventId ?? newEventId(),
      signals: cachedSignals(),
    });
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon(
        ENDPOINT,
        new Blob([body], { type: "application/json" }),
      );
      return;
    }
    void fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    });
  } catch {
    /* best-effort */
  }
}
