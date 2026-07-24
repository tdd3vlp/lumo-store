/**
 * Standalone NS.gifts Telegram Stars discovery probe — run ON THE WHITELISTED VPS.
 *
 * Read-only: authenticates, pulls the full stock, and prints every service /
 * category that looks Telegram/Stars-related together with its `fields` (the
 * inputs an order needs — recipient key, quantity key, min/max/step). Also tries
 * exchange_rate for each candidate service so we learn the pricing currency.
 *
 * Optionally, pass a Telegram username to probe a couple of guessed validation
 * endpoints (still read-only — no create_order, no pay_order, nothing charged):
 *
 *   node scripts/ns-gifts/probe-telegram.mjs
 *   node scripts/ns-gifts/probe-telegram.mjs durov
 *
 * Zero dependencies (Node built-ins only). Writes ns-catalog.json as a side
 * effect so the full catalog can be sent back for local work.
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
    console.error(`Missing ${k} (set it in the environment or in .env / .env.local)`);
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
console.log(`stock OK — ${categories.length} categories (full dump in ns-catalog.json)\n`);

const RX = /telegram|star|звезд|телеграм|прем/i;
const matches = [];
for (const c of categories) {
  const catHit = RX.test(c.category_name || "");
  const hitServices = (c.services || []).filter((s) => catHit || RX.test(s.service_name || ""));
  if (hitServices.length === 0) continue;
  matches.push({ category: c, services: hitServices });
}

if (matches.length === 0) {
  console.log("No Telegram/Stars-looking category or service found. Category names were:");
  for (const c of categories) console.log(`  - ${c.category_name} (${(c.services || []).length})`);
  process.exit(0);
}

for (const { category, services } of matches) {
  console.log("========================================================");
  console.log(`CATEGORY: ${category.category_name} (id=${category.category_id})`);
  console.log("fields:", JSON.stringify(category.fields, null, 2));
  for (const s of services) {
    console.log(
      `  • service_id=${s.service_id}  "${s.service_name}"  price=${s.price} ${s.currency}  in_stock=${s.in_stock}`,
    );
  }
  // Learn the pricing currency / FX for the first candidate service in the category.
  const probeId = services[0].service_id;
  const fx = await api("POST", "/api/v2/exchange_rate", token, { service_id: probeId });
  console.log(`  exchange_rate(service_id=${probeId}) HTTP ${fx.status}:`, JSON.stringify(fx.data));
  console.log("");
}

// Optional: probe guessed recipient-validation endpoints (read-only).
const username = process.argv[2];
if (username) {
  console.log(`\n--- recipient validation probes for "${username}" (read-only) ---`);
  const guesses = [
    ["POST", "/api/v2/telegram/check_user", { username }],
    ["POST", "/api/v2/telegram/check_user", { telegram_id: username }],
    ["POST", "/api/v2/telegram/check", { username }],
  ];
  for (const [method, path, body] of guesses) {
    try {
      const r = await api(method, path, token, body);
      console.log(`${method} ${path} ${JSON.stringify(body)} -> HTTP ${r.status}`, JSON.stringify(r.data));
    } catch (e) {
      console.log(`${method} ${path} threw`, String(e));
    }
  }
}
