import "server-only";
import { auditService } from "./service";
import { EMPTY_SIGNALS, SYSTEM_REQUEST_CONTEXT } from "./types";

// ORDER_PAID is contextual, not the authoritative record of payment (that is
// orders.paid_at + the payments row with the raw postback). So it is written
// best-effort AFTER the payment transaction commits — never inside it — so a
// failing audit (missing key, lock contention, table issue) can NEVER block a
// payment from being confirmed. The deterministic event_key makes it idempotent,
// and the reconcile worker backfills any that were lost to a crash between commit
// and this write. occurredAt is the order's paid_at, not "now".
export async function recordOrderPaid(input: {
  orderId: string;
  customerId: string | null;
  paidAt: Date;
  trsId?: string | null;
  backfill?: boolean;
}): Promise<void> {
  try {
    await auditService.record("ORDER_PAID", {
      eventKey: `ORDER_PAID:${input.orderId}`,
      refs: { orderId: input.orderId, customerId: input.customerId },
      context: SYSTEM_REQUEST_CONTEXT,
      signals: EMPTY_SIGNALS,
      warningVersion: null,
      payload: {
        provider: "paypalych",
        trsId: input.trsId ?? null,
        ...(input.backfill ? { backfill: true } : {}),
      },
      occurredAt: input.paidAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "audit failed";
    console.error(`[order-paid] ${input.orderId}: ${message}`);
  }
}
