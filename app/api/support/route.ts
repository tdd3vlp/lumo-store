import { sendSupportMessage } from "@/lib/mail";
import { clientIp, createRateLimiter } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// The form sends real email over our SMTP mailbox, so it's an open relay into
// our sender reputation unless throttled. The honeypot stops dumb bots; this
// caps a determined script to a handful of messages per minute per IP.
const supportLimiter = createRateLimiter({ windowMs: 60_000, max: 5 });

export async function POST(request: Request) {
  if (supportLimiter.limited(clientIp(request))) {
    return Response.json(
      { error: "Слишком много сообщений. Подождите немного." },
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

  // Honeypot: real users leave it empty; bots fill everything. Pretend success.
  if (typeof b.company === "string" && b.company.trim() !== "") {
    return Response.json({ ok: true });
  }

  const name = typeof b.name === "string" ? b.name.trim().slice(0, 100) : "";
  const contact = typeof b.contact === "string" ? b.contact.trim().slice(0, 200) : "";
  const message = typeof b.message === "string" ? b.message.trim().slice(0, 4000) : "";

  if (!contact || !message) {
    return Response.json(
      { error: "Укажите контакт для ответа и текст сообщения." },
      { status: 400 },
    );
  }

  try {
    await sendSupportMessage({ name, contact, message });
    return Response.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Не удалось отправить сообщение.";
    return Response.json({ error: msg }, { status: 500 });
  }
}
