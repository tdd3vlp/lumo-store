import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/auth/admin";
import { curateDenomination, listCuratedDenominations } from "@/lib/gift-cards/denominations";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function guard(): Promise<Response | null> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return Response.json({ error: "Not authenticated" }, { status: 401 });
  if (!isAdminEmail(email)) return Response.json({ error: "Forbidden" }, { status: 403 });
  return null;
}

export async function GET() {
  const denied = await guard();
  if (denied) return denied;

  try {
    const denominations = await listCuratedDenominations();
    return Response.json({ denominations });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load denominations";
    return Response.json({ error: message }, { status: 500 });
  }
}

function optionalMinor(value: unknown): number | null | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null; // caller validates
  return Math.round(n);
}

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
  const salePriceOverrideMinor = optionalMinor(b.salePriceOverrideMinor);
  const purchaseCostMinor = optionalMinor(b.purchaseCostMinor);
  if (salePriceOverrideMinor === null || purchaseCostMinor === null) {
    return Response.json(
      { error: "Prices must be non-negative numbers (in kopecks)" },
      { status: 400 },
    );
  }

  try {
    const result = await curateDenomination({
      productType: String(b.productType ?? ""),
      region: String(b.region ?? ""),
      currency: String(b.currency ?? ""),
      amountMajor: Number(b.amountMajor),
      displayName: String(b.displayName ?? ""),
      imageUrl: typeof b.imageUrl === "string" && b.imageUrl.trim() ? b.imageUrl.trim() : null,
      isPublished: Boolean(b.isPublished),
      nsGiftsServiceId:
        b.nsGiftsServiceId === undefined || b.nsGiftsServiceId === null
          ? null
          : Number(b.nsGiftsServiceId),
      salePriceOverrideMinor,
      purchaseCostMinor,
    });
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Curation failed";
    return Response.json({ error: message }, { status: 400 });
  }
}
