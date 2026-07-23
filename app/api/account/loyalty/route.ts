import { auth } from "@/auth";
import { getCustomerDiscountRates } from "@/lib/account/loyalty";
import { NO_LOYALTY_DISCOUNT } from "@/lib/account/loyalty-discount";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// The signed-in customer's current discount rates, for reflecting the loyalty
// discount in the client cart total. Display only — the charge is recomputed
// server-side at order creation. Signed-out (or any error) → base, no discount.
export async function GET() {
  const session = await auth();
  const customerId = session?.user?.customerId;
  const rates = customerId
    ? await getCustomerDiscountRates(customerId)
    : NO_LOYALTY_DISCOUNT;
  return Response.json(rates);
}
