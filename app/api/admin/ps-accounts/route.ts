import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/auth/admin";
import { PS_ACCOUNT_REGION_ORDER } from "@/lib/ps-accounts/config";
import { addPsAccount, availablePsAccountCounts } from "@/lib/ps-accounts/store";

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
  return Response.json({ counts: await availablePsAccountCounts() });
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
  const region = typeof b.region === "string" ? b.region : "";
  const email = typeof b.email === "string" ? b.email.trim() : "";
  const password = typeof b.password === "string" ? b.password : "";
  const totp = typeof b.totp === "string" ? b.totp.trim() : "";
  const birthdate = typeof b.birthdate === "string" ? b.birthdate.trim() : "";

  if (!PS_ACCOUNT_REGION_ORDER.includes(region)) {
    return Response.json({ error: "Некорректный регион." }, { status: 400 });
  }
  if (!email || !password) {
    return Response.json({ error: "Почта и пароль обязательны." }, { status: 400 });
  }

  try {
    await addPsAccount(region, { email, password, totp, birthdate });
    return Response.json({ ok: true, counts: await availablePsAccountCounts() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось сохранить аккаунт";
    return Response.json({ error: message }, { status: 500 });
  }
}
