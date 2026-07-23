/**
 * Standalone NS.gifts Xbox gift-card discovery probe — run ON THE WHITELISTED VPS.
 *
 * Read-only: authenticates, pulls the full stock, and prints every Xbox-looking
 * category/service with its price + currency + stock and the category `fields`,
 * so we can see which regions (US / TR / EU / ZA / …) and denominations are
 * actually sold and their wholesale USD cost.
 *
 *   node scripts/ns-gifts/probe-xbox.mjs
 *
 * Zero dependencies. Writes ns-catalog.json as a side effect.
 */
import { createHash, createHmac } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

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

const stockRes = await api("GET", "/api/v2/stock", token);
if (stockRes.status !== 200) {
  console.error("stock failed", stockRes.status, JSON.stringify(stockRes.data));
  process.exit(1);
}
const stock = stockRes.data;
writeFileSync("ns-catalog.json", JSON.stringify(stock, null, 2));
const categories = stock.categories || [];
console.log(`stock OK — ${categories.length} categories\n`);

// Xbox gift cards / balance top-ups — exclude the games/add-ons categories.
const RX = /xbox/i;
const EXCLUDE = /games|add-?on|game pass|ultimate|series|console/i;

for (const c of categories) {
  const name = c.category_name || "";
  if (!RX.test(name)) continue;
  const isGiftLike = !EXCLUDE.test(name) || /gift|card|balance|пополн|top-?up/i.test(name);
  const services = c.services || [];
  console.log("========================================================");
  console.log(`CATEGORY: ${name} (id=${c.category_id})  ${isGiftLike ? "" : "[games?]"}`);
  console.log("fields:", JSON.stringify(c.fields));
  for (const s of services) {
    console.log(
      `  • id=${s.service_id}  "${s.service_name}"  ${s.price} ${s.currency}  stock=${s.in_stock}`,
    );
  }
  console.log("");
}
