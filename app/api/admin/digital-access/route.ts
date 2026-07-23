import { auth } from "@/auth";
import {
  ADMIN_LOG_EXPORT_LIMIT,
  ADMIN_LOG_LIMIT,
  auditRepository,
} from "@/lib/audit/repository";
import { isAdminEmail } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function guard(): Promise<Response | null> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return Response.json({ error: "Not authenticated" }, { status: 401 });
  if (!isAdminEmail(email)) return Response.json({ error: "Forbidden" }, { status: 403 });
  return null;
}

// Admin view of the digital-goods access journal + one-click JSON export
// (?format=json). Read-only — the journal is append-only at the DB level.
export async function GET(request: Request) {
  const denied = await guard();
  if (denied) return denied;

  const url = new URL(request.url);
  const orderId = url.searchParams.get("orderId") ?? undefined;
  const customerId = url.searchParams.get("customerId") ?? undefined;
  const orderItemId = url.searchParams.get("orderItemId") ?? undefined;
  const orderPublicId = url.searchParams.get("orderPublicId") ?? undefined;
  const format = url.searchParams.get("format");

  // UUID filters must be well-formed, else Postgres 22P02 would 500. Validate
  // and 400 instead. (orderPublicId is free text — substring-matched safely.)
  for (const [name, value] of [
    ["orderId", orderId],
    ["customerId", customerId],
    ["orderItemId", orderItemId],
  ] as const) {
    if (value !== undefined && !UUID_RE.test(value)) {
      return Response.json({ error: `Invalid ${name}` }, { status: 400 });
    }
  }

  const isExport = format === "json";
  const rows = await auditRepository.list({
    orderId,
    customerId,
    orderItemId,
    orderPublicId,
    limit: isExport ? ADMIN_LOG_EXPORT_LIMIT : ADMIN_LOG_LIMIT,
  });

  if (isExport) {
    const stamp = new Date().toISOString().slice(0, 10);
    return new Response(JSON.stringify(rows, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="digital-access-log-${stamp}.json"`,
      },
    });
  }

  return Response.json({ rows });
}
