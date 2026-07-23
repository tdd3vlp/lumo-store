import "server-only";
import nodemailer from "nodemailer";

// SMTP is configured via env (e.g. Beget: smtp.beget.com, the support@ mailbox).
//   SMTP_HOST, SMTP_PORT (default 465), SMTP_USER, SMTP_PASS, SUPPORT_EMAIL
const HOST = process.env.SMTP_HOST;
const PORT = Number(process.env.SMTP_PORT ?? 465);
const USER = process.env.SMTP_USER;
const PASS = process.env.SMTP_PASS;
const TO = process.env.SUPPORT_EMAIL ?? "support@lumo-store.ru";

export function mailConfigured(): boolean {
  return Boolean(HOST && USER && PASS);
}

/** Sends a support-form submission to the support mailbox. */
export async function sendSupportMessage(input: {
  name: string;
  contact: string;
  message: string;
}): Promise<void> {
  if (!mailConfigured()) {
    throw new Error("Почта временно недоступна. Напишите нам в Telegram или MAX.");
  }
  const transport = nodemailer.createTransport({
    host: HOST,
    port: PORT,
    secure: PORT === 465, // 465 = implicit TLS
    auth: { user: USER, pass: PASS },
  });

  const text =
    `Имя: ${input.name || "—"}\n` +
    `Контакт для ответа: ${input.contact}\n\n` +
    `Сообщение:\n${input.message}`;

  await transport.sendMail({
    from: `"Lumo — форма поддержки" <${USER}>`,
    to: TO,
    // Lets support reply straight to the customer if they left an email.
    replyTo: /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.contact) ? input.contact : undefined,
    subject: `Обращение с сайта — ${input.name || "без имени"}`,
    text,
  });
}
