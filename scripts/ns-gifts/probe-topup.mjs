/**
 * Standalone NS.gifts Steam Top-Up probe — run ON THE WHITELISTED VPS.
 *
 * Calls create_order (NOT pay_order — no money moves) for the Steam Top-Up
 * service so we can learn how the top-up product behaves before wiring it up:
 *   - does create_order validate the Steam login / account region up front?
 *   - what does `total_to_pay` look like for a given `amount` (currency semantics)?
 *
 * Zero dependencies (Node built-ins only).
 *
 * Usage (on the VPS, with NS_GIFTS_* in the env):
 *   node probe-topup.mjs <steam_login> <amount_usd>
 * e.g.
 *   node probe-topup.mjs definitely_not_a_real_login_xyz 1
 *
 * pay_order is never called — any order created here stays unpaid and expires.
 */
import { createHash, createHmac } from "node:crypto";
import { randomUUID } from "node:crypto";
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
const amount = process.argv[3];
if (!account || !amount) {
  console.error("Usage: node probe-topup.mjs <steam_login> <amount_usd>");
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

async function apiCall(method, path, token, jsonBody) {
  const bodyBytes = jsonBody !== undefined ? Buffer.from(JSON.stringify(jsonBody)) : Buffer.alloc(0);
  const ts = String(Math.floor(Date.now() / 1000));
  const headers = {
    "X-User-Id": env.NS_GIFTS_USER_ID,
    "X-Timestamp": ts,
    "X-Signature": sign(method, path, "", bodyBytes, ts, token),
    "Content-Type": "application/json",
  };
  if (token) headers["X-Token"] = token;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: jsonBody !== undefined ? bodyBytes : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

const tokenRes = await apiCall("POST", "/api/v2/get_token", null, {
  login: env.NS_GIFTS_LOGIN,
  password: env.NS_GIFTS_PASSWORD,
});
if (tokenRes.status !== 200) {
  console.error("get_token failed:", tokenRes.status, JSON.stringify(tokenRes.data));
  process.exit(1);
}
const token = tokenRes.data.token;
console.log("AUTH OK");

const customId = randomUUID();
console.log(`\ncreate_order  service_id=1  account="${account}"  amount=${amount}  custom_id=${customId}`);
const created = await apiCall("POST", "/api/v2/create_order", token, {
  service_id: 1,
  custom_id: customId,
  fields: [
    { key: "account", value: account },
    { key: "amount", value: Number(amount) },
  ],
});
console.log("HTTP", created.status);
console.log(JSON.stringify(created.data, null, 2));
console.log("\n(no pay_order called — nothing was charged)");
