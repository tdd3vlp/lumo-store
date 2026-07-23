import { auth } from "@/auth";
import {
  clientSignalsFrom,
  requestContextFrom,
} from "@/lib/audit/request-context";
import { auditService } from "@/lib/audit/service";
import { isClientReportableEvent } from "@/lib/audit/types";
import { sql } from "@/lib/db";
import { createRateLimiter } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Telemetry writes to an append-only, hash-chained journal (rows are permanent),
// and the client fully chooses the idempotency key — so without a cap a signed-in
// user could spam distinct clientEventIds to bloat the table and wash out real
// events. Rate-limit per customer: a per-minute burst gate + a generous daily
// ceiling. Per-instance/in-memory (resets on deploy) — enough as a first line.
const perMinute = createRateLimiter({ windowMs: 60_000, max: 60 });
const perDay = createRateLimiter({ windowMs: 24 * 60 * 60_000, max: 1000 });

// Non-authoritative browser telemetry: CODE_PAGE_OPENED, CODE_COPIED,
// PAGE_CLOSED. The legally-significant events (WARNING_ACCEPTED / CODE_REVEALED /
// CODE_REOPENED) are written server-side by the reveal endpoint and are NOT
// accepted here. Idempotent on (eventType, sessionId, clientEventId) so duplicate
// beacons / double-sends collapse to one row.
export async function POST(request: Request) {
  const session = await auth();
  const customerId = session?.user?.customerId;
  if (!customerId) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Cap journal writes per customer (minute gate short-circuits before the daily
  // counter, so a blocked burst doesn't keep accumulating against the day).
  if (perMinute.limited(customerId) || perDay.limited(customerId)) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  const eventType = b.eventType;
  const clientEventId =
    typeof b.clientEventId === "string" ? b.clientEventId.trim() : "";
  const orderItemId =
    typeof b.orderItemId === "string" ? b.orderItemId : null;

  if (!isClientReportableEvent(eventType)) {
    return Response.json({ error: "Unsupported event" }, { status: 400 });
  }
  if (!clientEventId) {
    return Response.json({ error: "clientEventId required" }, { status: 400 });
  }

  const signals = clientSignalsFrom(b.signals);
  const sessionId = signals.sessionId ?? "no-session";

  // If an item is named, confirm the caller owns it (and resolve refs). An item
  // that isn't theirs is silently dropped from refs — we never leak or trust it.
  let orderId: string | null = null;
  let productId: string | null = null;
  let ownedItemId: string | null = null;
  if (orderItemId) {
    const [item] = await sql`
      SELECT items.id, items.denomination_id, orders.id AS order_id
      FROM order_items items
      JOIN orders ON orders.id = items.order_id
      WHERE items.id = ${orderItemId} AND orders.customer_id = ${customerId}
    `;
    if (item) {
      ownedItemId = String(item.id);
      orderId = String(item.order_id);
      productId =
        item.denomination_id === null ? null : String(item.denomination_id);
    }
  }

  try {
    await auditService.record(eventType, {
      eventKey: `${eventType}:${sessionId}:${clientEventId}`,
      refs: { orderId, orderItemId: ownedItemId, customerId, productId },
      context: requestContextFrom(request),
      signals,
    });
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "audit failed";
    console.error(`[account/audit-events] ${eventType}: ${message}`);
    // Telemetry is fire-and-forget — report the failure honestly (200 ok:false),
    // not a misleading 202 (Accepted). The client ignores the body either way.
    return Response.json({ ok: false }, { status: 200 });
  }
}
