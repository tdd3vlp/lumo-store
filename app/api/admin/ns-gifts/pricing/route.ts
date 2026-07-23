import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/auth/admin";
import { getNsPricing, setNsPricing } from "@/lib/products/pricing";

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
  const pricing = await getNsPricing();
  return Response.json(pricing);
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
  const rate = Number(b.rate);
  const markupBps = Number(b.markupBps);
  const topupMarkupBps = Number(b.topupMarkupBps);

  try {
    await setNsPricing(rate, markupBps, topupMarkupBps);
    return Response.json({ rate, markupBps, topupMarkupBps });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save pricing";
    return Response.json({ error: message }, { status: 400 });
  }
}
