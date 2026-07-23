import { auth } from "@/auth";
import { WARNING_VERSION } from "@/lib/audit/constants";
import {
  clientSignalsFrom,
  requestContextFrom,
} from "@/lib/audit/request-context";
import {
  CodeDeliveryError,
  revealGiftCardCodes,
} from "@/lib/code-delivery/service";
import { createRateLimiter } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// A repeat reveal (CODE_REOPENED) + WARNING_ACCEPTED use a client-chosen event id,
// so each call appends permanent rows to the journal. Cap per customer so reopen
// spam can't bloat the hash-chained table. Reveals are heavier than telemetry, so
// the ceilings are tighter. Per-instance/in-memory (resets on deploy).
const perMinute = createRateLimiter({ windowMs: 60_000, max: 20 });
const perDay = createRateLimiter({ windowMs: 24 * 60 * 60_000, max: 300 });

// Reveal a purchased gift-card code. The code is NEVER in the initial page HTML/
// JSON — it is returned only here, after the customer accepts the warning and the
// reveal is journalled (journal-first: see revealGiftCardCodes). Idempotent per
// clientEventId; the first successful reveal is the transfer-of-record moment.
export async function POST(request: Request) {
  const session = await auth();
  const customerId = session?.user?.customerId;
  if (!customerId) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (perMinute.limited(customerId) || perDay.limited(customerId)) {
    return Response.json(
      { error: "Слишком много запросов. Подождите немного." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  const orderItemId = typeof b.orderItemId === "string" ? b.orderItemId : "";
  const acceptedWarning = b.acceptedWarning === true;
  const warningVersion = Number(b.warningVersion);
  const clientEventId =
    typeof b.clientEventId === "string" ? b.clientEventId.trim() : "";

  if (!orderItemId) {
    return Response.json({ error: "orderItemId required" }, { status: 400 });
  }
  if (!clientEventId) {
    return Response.json({ error: "clientEventId required" }, { status: 400 });
  }
  if (!acceptedWarning) {
    return Response.json(
      { error: "Условия получения не приняты." },
      { status: 400 },
    );
  }
  if (warningVersion !== WARNING_VERSION) {
    return Response.json(
      { error: "Условия получения обновились. Обновите страницу." },
      { status: 409 },
    );
  }

  try {
    const outcome = await revealGiftCardCodes({
      customerId,
      orderItemId,
      acceptedWarning,
      warningVersion,
      clientEventId,
      context: requestContextFrom(request),
      signals: clientSignalsFrom(b.signals),
    });
    return Response.json({
      ok: true,
      codes: outcome.codes,
      firstReveal: outcome.firstReveal,
    });
  } catch (error) {
    if (error instanceof CodeDeliveryError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "reveal failed";
    console.error(`[account/reveal] ${orderItemId}: ${message}`);
    return Response.json(
      { error: "Не удалось получить код. Попробуйте позже." },
      { status: 500 },
    );
  }
}
