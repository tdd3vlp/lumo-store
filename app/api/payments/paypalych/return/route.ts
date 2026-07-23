export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// PayPalych redirects the payer's browser here via POST (success_url / fail_url).
// Next.js pages only handle GET, so this handler swallows the POST and 303s the
// browser to the status page, which shows the order's real state from the DB
// (the Result-URL callback is the source of truth — these redirect params are
// display-only and never trusted for fulfilment).
//
// The order id is taken from the `order` query param (set on the per-bill
// success/fail URLs) or, failing that, from the posted `InvId` field — so a
// single static URL configured in the dashboard works too.

function statusRedirect(base: string, order: string): Response {
  const target = new URL(`${base}/checkout/status`);
  if (order) target.searchParams.set("order", order);
  return Response.redirect(target.toString(), 303);
}

export function GET(request: Request) {
  const url = new URL(request.url);
  const base = process.env.AUTH_URL?.replace(/\/$/, "") ?? url.origin;
  return statusRedirect(base, url.searchParams.get("order") ?? "");
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const base = process.env.AUTH_URL?.replace(/\/$/, "") ?? url.origin;
  let order = url.searchParams.get("order") ?? "";
  if (!order) {
    try {
      order = new URLSearchParams(await request.text()).get("InvId") ?? "";
    } catch {
      order = "";
    }
  }
  return statusRedirect(base, order);
}
