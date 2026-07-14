/**
 * Standalone probe for NS.gifts Steam validation + FX endpoints — run ON THE
 * WHITELISTED VPS. Read-only: calls exchange_rate and steam/check_user only
 * (no create_order, no pay_order). Zero dependencies.
 *
 *   node probe-steam.mjs <login1> [login2 ...]
 */
import { createHash, createHmac } from "node:crypto";
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
const BASE = env.NS_GIFTS_BASE_URL || "https://api.ns.gifts";

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
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

const tk = await api("POST", "/api/v2/get_token", null, { login: env.NS_GIFTS_LOGIN, password: env.NS_GIFTS_PASSWORD });
if (tk.status !== 200) { console.error("get_token failed", tk.status, JSON.stringify(tk.data)); process.exit(1); }
const token = tk.data.token;
console.log("AUTH OK\n");

const fx = await api("POST", "/api/v2/exchange_rate", token, { service_id: 1 });
console.log("exchange_rate(service_id=1) HTTP", fx.status);
console.log(JSON.stringify(fx.data), "\n");

for (const login of process.argv.slice(2)) {
  const r = await api("POST", "/api/v2/steam/check_user", token, { steam_id: login });
  console.log(`check_user("${login}") HTTP ${r.status} ->`, JSON.stringify(r.data));
}
