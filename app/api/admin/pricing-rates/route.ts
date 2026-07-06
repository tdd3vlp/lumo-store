import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/auth/admin";
import { parseCoeffToBps, parseRubRateToMinorPerUnit } from "@/lib/pricing/rates";
import {
  getRegionalPricingRates,
  updateRegionalPricingRate,
} from "@/lib/pricing/rates.server";

export const dynamic = "force-dynamic";

async function guard(): Promise<Response | null> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!isAdminEmail(email)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function GET() {
  const denied = await guard();
  if (denied) return denied;

  try {
    const rates = await getRegionalPricingRates();
    return Response.json({ rates });
  } catch {
    return Response.json(
      { error: "Failed to load pricing rates" },
      { status: 500 },
    );
  }
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
  const region = typeof b?.region === "string" ? b.region.trim() : "";
  const rateValue = b?.rate;
  const coeffValue = b?.cardCoefficient;

  if (!region) {
    return Response.json({ error: "region is required" }, { status: 400 });
  }
  if (typeof rateValue !== "string") {
    return Response.json({ error: "rate must be a string" }, { status: 400 });
  }

  let rubMinorPerUnit: number;
  try {
    rubMinorPerUnit = parseRubRateToMinorPerUnit(rateValue);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Invalid rate" },
      { status: 400 },
    );
  }

  let cardCoefficientBps: number | undefined;
  if (coeffValue !== undefined) {
    if (typeof coeffValue !== "string") {
      return Response.json(
        { error: "cardCoefficient must be a string" },
        { status: 400 },
      );
    }
    try {
      cardCoefficientBps = parseCoeffToBps(coeffValue);
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : "Invalid coefficient" },
        { status: 400 },
      );
    }
  }

  try {
    const rate = await updateRegionalPricingRate(region, rubMinorPerUnit, cardCoefficientBps);
    return Response.json({ rate });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update rate";
    const status = message.startsWith("Unknown region") ? 404 : 500;
    return Response.json({ error: message }, { status });
  }
}
