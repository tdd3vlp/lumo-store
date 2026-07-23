import "server-only";
import { paypalychSignature, signaturesMatch } from "./signature";

// Client for the PayPalych payment gateway (brands: Pally / pally.info, API host
// pal24.pro). Docs: https://pally.info/reference/api
//
// Flow: create a bill (POST /api/v1/bill/create) → redirect the payer to the
// returned `link_page_url`. When the payment resolves, PayPalych sends a
// server-to-server Payment postback to the shop's Result URL and, in parallel,
// redirects the payer's browser (POST) to our success_url / fail_url. Both the
// postback and the redirect are authenticated with the same signature:
//
//   SignatureValue = strtoupper(md5(OutSum . ":" . InvId . ":" . apiToken))
//
// The postback is the source of truth for fulfilment (the browser redirect can
// be spoofed / never arrive); it retries up to 5 times with exponential backoff
// until our endpoint answers HTTP 200.

const DEFAULT_BASE_URL = "https://pal24.pro";

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

function baseUrl(): string {
  return (process.env.PAYPALYCH_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, "");
}

export class PayPalychApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super(`PayPalych API HTTP ${status}: ${JSON.stringify(body)}`);
    this.name = "PayPalychApiError";
  }
}

export type PayPalychCurrency = "RUB" | "USD" | "EUR";

/**
 * Account identifier(s) tied to a line, fed to PayPalych's antifraud system.
 * Pass only the keys that apply to the item's category; never send empty
 * strings or "NULL" — omit unavailable fields entirely.
 */
export type BillItemExtra = {
  /** Steam login for a Steam balance top-up. */
  steam_account?: string;
  /** Telegram @username a Stars top-up is credited to. */
  telegram_username?: string;
  /** Numeric Telegram id — only for sales via a Telegram bot. */
  telegram_id?: string;
  /** Generic account/email the service is activated on. */
  account?: string;
};

export type BillItem = {
  /** Product / service name shown in antifraud logs. */
  name: string;
  /** Price per unit in major units. */
  price: number;
  quantity: number;
  /** Internal category, e.g. "steam", "digital/stars", "digital/giftcard/playstation". */
  category: string;
  extra?: BillItemExtra;
};

export type CreateBillParams = {
  /** Amount in major units (e.g. 380.99). */
  amount: number;
  /** Our order identifier — echoed back as `InvId` in the postback. */
  orderId: string;
  currencyIn?: PayPalychCurrency;
  /** Order / category name shown in the payment form and antifraud logs. */
  name?: string;
  /** Shown in the payment form. */
  description?: string;
  /** NORMAL = one-time (default), MULTI = reusable link. */
  type?: "normal" | "multi";
  /** Payment form language. */
  locale?: "ru" | "en";
  /** Opaque string echoed back in the postback. */
  custom?: string;
  /** Who pays the acquiring commission: 1 = payer (default), 0 = merchant. */
  payerPaysCommission?: 0 | 1;
  /** Buyer email — sent uncoded (multipart) for antifraud + form pre-fill. */
  payerEmail?: string;
  /** Line items for the antifraud system. */
  items?: BillItem[];
  /** Bill lifetime in seconds. */
  ttlSeconds?: number;
  successUrl?: string;
  failUrl?: string;
  /** "Return to shop" link target on the payment page. */
  returnUrl?: string;
};

export type CreateBillResult = {
  success: boolean;
  /** Page with a QR code. */
  linkUrl: string;
  /** Hosted payment page — redirect the payer here. */
  linkPageUrl: string;
  /** Unique bill identifier (returned as `TrsId` in the postback). */
  billId: string;
};

type CreateBillResponse = {
  success?: boolean | string;
  link_url?: string;
  link_page_url?: string;
  bill_id?: string;
};

/**
 * Create a bill and get the hosted payment-page URL to redirect the payer to.
 * `shop_id` comes from PAYPALYCH_SHOP_ID; without it the Success/Fail/Result
 * URLs configured for the shop will not fire.
 */
export async function createBill(
  params: CreateBillParams,
): Promise<CreateBillResult> {
  // multipart/form-data (not urlencoded): keeps the email's "@" uncoded for the
  // antifraud system and cleanly carries the nested items[i][...] fields. fetch
  // sets the Content-Type (with boundary) itself, so we must not set it here.
  const form = new FormData();
  form.set("amount", params.amount.toFixed(2));
  form.set("shop_id", env("PAYPALYCH_SHOP_ID"));
  form.set("order_id", params.orderId);
  form.set("type", params.type ?? "normal");
  form.set("currency_in", params.currencyIn ?? "RUB");
  form.set("payer_pays_commission", String(params.payerPaysCommission ?? 1));
  if (params.name) form.set("name", params.name);
  if (params.description) form.set("description", params.description);
  if (params.locale) form.set("locale", params.locale);
  if (params.custom) form.set("custom", params.custom);
  if (params.payerEmail) {
    // Both: `payer_email` for antifraud identification, `payer_data[email]`
    // pre-fills the payment form.
    form.set("payer_email", params.payerEmail);
    form.set("payer_data[email]", params.payerEmail);
  }
  if (params.ttlSeconds != null) form.set("ttl", String(params.ttlSeconds));
  if (params.successUrl) form.set("success_url", params.successUrl);
  if (params.failUrl) form.set("fail_url", params.failUrl);
  if (params.returnUrl) form.set("return_url", params.returnUrl);

  params.items?.forEach((item, i) => {
    form.set(`items[${i}][name]`, item.name);
    form.set(`items[${i}][price]`, item.price.toFixed(2));
    form.set(`items[${i}][quantity]`, String(item.quantity));
    form.set(`items[${i}][category]`, item.category);
    // Only non-empty extra keys — the API rejects empty strings / "NULL".
    for (const [key, value] of Object.entries(item.extra ?? {})) {
      if (value) form.set(`items[${i}][extra][${key}]`, value);
    }
  });

  const res = await fetch(`${baseUrl()}/api/v1/bill/create`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env("PAYPALYCH_API_TOKEN")}`,
      Accept: "application/json",
    },
    body: form,
  });

  const data = (await res.json().catch(() => null)) as CreateBillResponse | null;
  if (!res.ok || !data) throw new PayPalychApiError(res.status, data);
  // The API returns `success` as the string "true" in its examples; accept both.
  const ok = data.success === true || data.success === "true";
  if (!ok || !data.link_page_url || !data.bill_id) {
    throw new PayPalychApiError(res.status, data);
  }

  return {
    success: true,
    linkUrl: data.link_url ?? data.link_page_url,
    linkPageUrl: data.link_page_url,
    billId: data.bill_id,
  };
}

/** Payment postback statuses (Result URL, application/x-www-form-urlencoded). */
export type PayPalychStatus = "SUCCESS" | "UNDERPAID" | "OVERPAID" | "FAIL";

/** Fields of the Payment postback sent to the shop's Result URL. */
export type PaymentPostback = {
  InvId: string;
  OutSum: string;
  Commission?: string;
  TrsId?: string;
  Status: PayPalychStatus;
  CurrencyIn?: PayPalychCurrency;
  custom?: string;
  AccountType?: string;
  AccountNumber?: string;
  BalanceAmount?: string;
  BalanceCurrency?: string;
  PayerPhone?: string;
  PayerEmail?: string;
  PayerName?: string;
  PayerComment?: string;
  ErrorCode?: string;
  ErrorMessage?: string;
  SignatureValue: string;
};

/**
 * Recompute the expected signature: strtoupper(md5(OutSum:InvId:apiToken)).
 * Uses the exact string values received from the gateway — do not reformat
 * `outSum`, since the gateway signs the string it sent (e.g. "18.54").
 */
export function expectedSignature(outSum: string, invId: string): string {
  return paypalychSignature(outSum, invId, env("PAYPALYCH_API_TOKEN"));
}

/** Timing-safe check of a postback / redirect signature. */
export function verifySignature(
  outSum: string,
  invId: string,
  signatureValue: string,
): boolean {
  return signaturesMatch(signatureValue, expectedSignature(outSum, invId));
}

export type BillStatusResult = {
  status: string;
  raw: unknown;
};

/**
 * Server-side verification of a bill's state — call before trusting a browser
 * success redirect, or to reconcile a missed postback.
 * GET /api/v1/bill/status?id={billId}
 */
export async function getBillStatus(billId: string): Promise<BillStatusResult> {
  const url = `${baseUrl()}/api/v1/bill/status?id=${encodeURIComponent(billId)}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${env("PAYPALYCH_API_TOKEN")}`,
      Accept: "application/json",
    },
  });

  const data = (await res.json().catch(() => null)) as
    | { status?: string }
    | null;
  if (!res.ok || !data) throw new PayPalychApiError(res.status, data);
  return { status: data.status ?? "UNKNOWN", raw: data };
}
