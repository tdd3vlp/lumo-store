import { randomUUID } from "node:crypto";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/auth/admin";
import { addInventoryCodes, setNsGiftsServiceId } from "@/lib/gift-cards/denominations";
import { createOrder, getOrderInfo, payOrder } from "@/lib/ns-gifts/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function guard(): Promise<Response | null> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return Response.json({ error: "Not authenticated" }, { status: 401 });
  if (!isAdminEmail(email)) return Response.json({ error: "Forbidden" }, { status: 403 });
  return null;
}

// Buying stock from NS.gifts is a real-money, NON-idempotent action (pay_order
// returns 409 on retry). The flow is deliberately split so a human sees the
// real total NS.gifts quotes before committing:
//   step "create" -> createOrder, returns { customId, totalToPay }
//   step "pay"    -> payOrder(customId), inserts codes into inventory
//   step "status" -> getOrderInfo(customId), for when a call's outcome is unclear
export async function POST(request: Request) {
  const denied = await guard();
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  const step = String(b.step ?? "");

  if (step === "create") {
    const serviceId = Number(b.serviceId);
    const quantity = Number(b.quantity ?? 1);
    if (!Number.isInteger(serviceId) || serviceId <= 0) {
      return Response.json({ error: "serviceId is required" }, { status: 400 });
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      return Response.json({ error: "quantity must be a positive integer" }, { status: 400 });
    }
    const customId = randomUUID();
    try {
      const created = await createOrder({
        serviceId,
        customId,
        fields: [{ key: "quantity", value: quantity }],
      });
      return Response.json({
        customId,
        totalToPay: created.total_to_pay,
        status: created.status,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "createOrder failed";
      return Response.json({ error: message }, { status: 502 });
    }
  }

  if (step === "pay") {
    const customId = String(b.customId ?? "");
    const serviceId = Number(b.serviceId);
    const denominationId = String(b.denominationId ?? "");
    if (!customId) return Response.json({ error: "customId is required" }, { status: 400 });
    if (!denominationId) {
      return Response.json({ error: "denominationId is required" }, { status: 400 });
    }

    let paid;
    try {
      paid = await payOrder({ customId });
    } catch (error) {
      const message = error instanceof Error ? error.message : "payOrder failed";
      return Response.json({ error: message, customId }, { status: 502 });
    }

    if (paid.status !== "completed" || !paid.pins) {
      return Response.json(
        {
          error: `Purchase did not complete: ${paid.status} ${paid.note ?? ""}`.trim(),
          customId,
        },
        { status: 502 },
      );
    }

    // Money already spent. Never log the codes themselves (bearer secrets):
    // if the DB insert below fails, they're recoverable from NS.gifts via
    // getOrderInfo(custom_id), which re-returns the same pins.
    console.log(
      `[ns-gifts/buy] paid custom_id=${customId} codes=${paid.pins.length} balance=${paid.balance}`,
    );

    try {
      if (Number.isInteger(serviceId) && serviceId > 0) {
        await setNsGiftsServiceId(denominationId, serviceId);
      }
      const result = await addInventoryCodes({
        denominationId,
        codes: paid.pins,
        supplierReference: `ns.gifts:${customId}`,
      });
      return Response.json({
        inserted: result.inserted,
        total: result.total,
        balance: paid.balance,
        customId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to store codes";
      return Response.json(
        {
          error: `Paid, but storing codes failed: ${message}. Codes are in the server log for custom_id ${customId}.`,
          customId,
        },
        { status: 500 },
      );
    }
  }

  if (step === "status") {
    const customId = String(b.customId ?? "");
    if (!customId) return Response.json({ error: "customId is required" }, { status: 400 });
    try {
      const info = await getOrderInfo(customId);
      return Response.json({
        customId,
        status: info.status,
        statusMessage: info.status_message,
        product: info.product,
        quantity: info.quantity,
        hasPins: Array.isArray(info.pins) && info.pins.length > 0,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "order_info failed";
      return Response.json({ error: message }, { status: 502 });
    }
  }

  return Response.json({ error: "Unknown step" }, { status: 400 });
}
