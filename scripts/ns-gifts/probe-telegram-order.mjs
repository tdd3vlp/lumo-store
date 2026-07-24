/**
 * Standalone NS.gifts Telegram Stars create_order probe — run ON THE WHITELISTED VPS.
 *
 * Calls create_order (NOT pay_order — no money moves, the order stays unpaid and
 * expires) for a Telegram Stars package so we learn:
 *   - does create_order validate the recipient `account_number` up front?
 *   - what does the response look like (total_to_pay, currency, status)?
 *
 * Usage (on the VPS, with NS_GIFTS_* in the env / ./.env):
 *   node scripts/ns-gifts/probe-telegram-order.mjs <account> [service_id]
 * e.g.
 *   node scripts/ns-gifts/probe-telegram-order.mjs some_fake_user_xyz 2249
 *
 * Zero dependencies (Node built-ins only). pay_order is never called.
 */
import { createHash, createHmac, randomUUID } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";

function loadEnv() {
  const env = { ...process.env };
  for (const file of [".env.local", ".env"]) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const m = line.match(/^\s*(NS_GIFTS_[A-Z_]+)\s*=\s*(.*)\s*$/);
      if (m && !env[m[1]]) env[m[1]] = m[2];
    }
  }
  return env;
}

const env = loadEnv();
for (const k of ["NS_GIFTS_USER_ID", "NS_GIFTS_LOGIN", "NS_GIFTS_PASSWORD", "NS_GIFTS_API_SECRET"]) {
  if (!env[k]) {
    console.error(`Missing ${k}`);
    process.exit(1);
  }
}
const BASE = env.NS_GIFTS_BASE_URL || "https://api.ns.gifts";
const account = process.argv[2];
const serviceId = Number(process.argv[3] || 2249);
if (!account) {
  console.error("Usage: node probe-telegram-order.mjs <account> [service_id]");
  process.exit(1);
}

function sign(method, path, query, bodyBytes, ts, token) {
  const bodyHash = createHash("sha256").update(bodyBytes).digest("hex");
  const parts = [method.toUpperCase(), path, query, ts];
  if (token !== null) parts.push(token);
  parts.push(bodyHash);
  const key = Buffer.from(env.NS_GIFTS_API_SECRET, "base64");
  return createHmac("sha256", key).update(parts.join("\n")).digest("base64");
}

async function api(method, path, token, jsonBody) {
  const bytes = jsonBody !== undefined ? Buffer.from(JSON.stringify(jsonBody)) : Buffer.alloc(0);
  const ts = String(Math.floor(Date.now() / 1000));
  const headers = {
    "X-User-Id": env.NS_GIFTS_USER_ID,
    "X-Timestamp": ts,
    "X-Signature": sign(method, path, "", bytes, ts, token),
    "Content-Type": "application/json",
  };
  if (token) headers["X-Token"] = token;
  const res = await fetch(BASE + path, { method, headers, body: jsonBody !== undefined ? bytes : undefined });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

const tk = await api("POST", "/api/v2/get_token", null, {
  login: env.NS_GIFTS_LOGIN,
  password: env.NS_GIFTS_PASSWORD,
});
if (tk.status !== 200) {
  console.error("get_token failed", tk.status, JSON.stringify(tk.data));
  process.exit(1);
}
const token = tk.data.token;
console.log("AUTH OK\n");

const customId = randomUUID();
console.log(`create_order service_id=${serviceId} account_number="${account}" custom_id=${customId}`);
const created = await api("POST", "/api/v2/create_order", token, {
  service_id: serviceId,
  custom_id: customId,
  fields: [{ key: "account_number", value: account }],
});
console.log("HTTP", created.status);
console.log(JSON.stringify(created.data, null, 2));
console.log("\n(no pay_order called — nothing was charged)");
