import "server-only";
import { createHash, createHmac } from "node:crypto";

// HMAC-signed client for the NS.gifts wholesale API (wholesale.ns.gifts/api-docs).
// Ported from the sibling `market` service — kept as a standalone copy rather
// than a shared package because the two runtimes differ (Next.js here, Hono
// there).
//
// Two-layer auth: long-term api_secret + short-lived (2h) session token from
// /get_token. Every request is signed:
//   string_to_sign = METHOD "\n" PATH "\n" QUERY "\n" TS "\n" [TOKEN "\n"] sha256_hex(BODY)
//   signature = base64(HMAC-SHA256(base64_decode(api_secret), string_to_sign))
// The bootstrap /get_token call omits the TOKEN line.

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

function baseUrl(): string {
  return process.env.NS_GIFTS_BASE_URL ?? "https://api.ns.gifts";
}

function sign(
  method: string,
  path: string,
  query: string,
  bodyBytes: Buffer,
  ts: string,
  token: string | null,
): string {
  const bodyHash = createHash("sha256").update(bodyBytes).digest("hex");
  const parts = [method.toUpperCase(), path, query, ts];
  if (token !== null) parts.push(token);
  parts.push(bodyHash);
  const stringToSign = parts.join("\n");
  const key = Buffer.from(env("NS_GIFTS_API_SECRET"), "base64");
  return createHmac("sha256", key).update(stringToSign).digest("base64");
}

export class NsGiftsApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super(`NS.gifts API HTTP ${status}: ${JSON.stringify(body)}`);
  }
}

type TokenResponse = { user_id: number; token: string; expires_in: number };

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  const path = "/api/v2/get_token";
  const bodyBytes = Buffer.from(
    JSON.stringify({ login: env("NS_GIFTS_LOGIN"), password: env("NS_GIFTS_PASSWORD") }),
  );
  const ts = String(Math.floor(Date.now() / 1000));
  const headers = {
    "X-User-Id": env("NS_GIFTS_USER_ID"),
    "X-Timestamp": ts,
    "X-Signature": sign("POST", path, "", bodyBytes, ts, null),
    "Content-Type": "application/json",
  };

  const res = await fetch(`${baseUrl()}${path}`, { method: "POST", headers, body: bodyBytes });
  const data = await res.json();
  if (!res.ok) throw new NsGiftsApiError(res.status, data);

  const parsed = data as TokenResponse;
  cachedToken = { token: parsed.token, expiresAt: Date.now() + (parsed.expires_in - 120) * 1000 };
  return parsed.token;
}

async function ensureToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.token;
  return getToken();
}

async function call<T>(
  method: "GET" | "POST",
  path: string,
  options: { params?: Record<string, string | number>; jsonBody?: unknown } = {},
): Promise<T> {
  const token = await ensureToken();
  const query = options.params
    ? Object.entries(options.params)
        .map(([k, v]) => `${k}=${v}`)
        .join("&")
    : "";
  const bodyBytes = options.jsonBody !== undefined
    ? Buffer.from(JSON.stringify(options.jsonBody))
    : Buffer.alloc(0);

  const doRequest = async (bearerToken: string) => {
    const ts = String(Math.floor(Date.now() / 1000));
    const headers = {
      "X-User-Id": env("NS_GIFTS_USER_ID"),
      "X-Timestamp": ts,
      "X-Token": bearerToken,
      "X-Signature": sign(method, path, query, bodyBytes, ts, bearerToken),
      "Content-Type": "application/json",
    };
    const url = `${baseUrl()}${path}${query ? `?${query}` : ""}`;
    return fetch(url, {
      method,
      headers,
      body: options.jsonBody !== undefined ? bodyBytes : undefined,
    });
  };

  let res = await doRequest(token);
  if (res.status === 401) {
    // Token might have expired despite our local TTL tracking — refresh once.
    const fresh = await getToken();
    res = await doRequest(fresh);
  }

  const data = await res.json();
  if (!res.ok) throw new NsGiftsApiError(res.status, data);
  return data as T;
}

export type NsGiftsField = {
  key: string;
  type: string;
  name?: string;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
};

export type NsGiftsService = {
  service_id: number;
  service_name: string;
  price: number;
  currency: string;
  in_stock: number;
};

export type NsGiftsCategory = {
  category_name: string;
  category_id: number;
  services: NsGiftsService[];
  fields: NsGiftsField[];
};

export async function getStock(): Promise<{ categories: NsGiftsCategory[] }> {
  return call("GET", "/api/v2/stock");
}

export type CreateOrderResponse = {
  custom_id: string;
  total_to_pay: string;
  status: string;
};

export async function createOrder(input: {
  serviceId: number;
  customId: string;
  fields: Array<{ key: string; value: string | number }>;
}): Promise<CreateOrderResponse> {
  return call("POST", "/api/v2/create_order", {
    jsonBody: {
      service_id: input.serviceId,
      custom_id: input.customId,
      fields: input.fields,
    },
  });
}

export type PayOrderResponse = {
  custom_id: string;
  status: "completed" | "refunded" | "in_progress" | "insufficient";
  balance: string;
  pins: string[] | null;
  note: string | null;
};

export async function payOrder(input: {
  customId: string;
  totpCode?: string;
}): Promise<PayOrderResponse> {
  return call("POST", "/api/v2/pay_order", {
    jsonBody: {
      custom_id: input.customId,
      ...(input.totpCode ? { totp_code: input.totpCode } : {}),
    },
  });
}

export type OrderInfoResponse = {
  custom_id: string;
  status: number;
  status_message: string;
  product: string;
  quantity: number;
  total_price: number;
  date: string;
  pins: string[] | null;
};

export async function getOrderInfo(customId: string): Promise<OrderInfoResponse> {
  return call("GET", `/api/v2/order_info/${customId}`);
}

export async function checkBalance(): Promise<{ balance: string }> {
  return call("GET", "/api/v2/check_balance");
}
