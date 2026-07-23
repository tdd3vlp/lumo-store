import "server-only";
import nodemailer from "nodemailer";
import {
  renderGiftCardDelivery,
  renderPsAccountReady,
  renderTopUpConfirmation,
} from "./render";
import type { EmailProvider } from "./types";

// Transactional email over the same Beget SMTP mailbox the support form uses
// (SMTP_HOST/PORT/USER/PASS). The customer's account (ЛК) is the delivery of
// record; these are branded notifications. All rendering lives in ./render
// (pure, previewable); this module only adds the SMTP transport and send.

const HOST = process.env.SMTP_HOST;
const PORT = Number(process.env.SMTP_PORT ?? 465);
const USER = process.env.SMTP_USER;
const PASS = process.env.SMTP_PASS;

export function mailConfigured(): boolean {
  return Boolean(HOST && USER && PASS);
}

function makeTransport() {
  return nodemailer.createTransport({
    host: HOST,
    port: PORT,
    secure: PORT === 465,
    auth: { user: USER, pass: PASS },
  });
}

async function send(to: string, email: { subject: string; text: string; html: string }) {
  if (!mailConfigured()) throw new Error("SMTP is not configured");
  const info = await makeTransport().sendMail({
    from: `"Lumo" <${USER}>`,
    to,
    subject: email.subject,
    text: email.text,
    html: email.html,
  });
  return { providerMessageId: info.messageId };
}

export function giftCardMailer(): EmailProvider {
  return {
    async sendGiftCardDelivery(input) {
      return send(input.recipient, renderGiftCardDelivery(input));
    },
    async sendPsAccountReady(input) {
      return send(input.recipient, renderPsAccountReady(input));
    },
    async sendTopUpConfirmation(input) {
      return send(input.recipient, renderTopUpConfirmation(input));
    },
  };
}
