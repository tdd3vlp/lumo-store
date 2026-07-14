/**
 * Standalone NS.gifts catalog dumper — run this ON THE WHITELISTED VPS.
 *
 * NS.gifts restricts its API by source IP, so it can only be reached from the
 * server that was added to the allowlist. This script has zero dependencies
 * (Node built-ins only), so it runs anywhere Node is installed without npm
 * install / build.
 *
 * Usage on the VPS (with NS_GIFTS_* in the environment, or in ./.env / ./.env.local):
 *
 *   node scripts/ns-gifts/dump-catalog.mjs
 *
 * It writes the full catalog to ns-catalog.json and prints a summary. Send that
 * JSON back for local development / bulk-import design.
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

async function getToken() {
  const path = "/api/v2/get_token";
  const body = Buffer.from(JSON.stringify({ login: env.NS_GIFTS_LOGIN, password: env.NS_GIFTS_PASSWORD }));
  const ts = String(Math.floor(Date.now() / 1000));
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: {
      "X-User-Id": env.NS_GIFTS_USER_ID,
      "X-Timestamp": ts,
      "X-Signature": sign("POST", path, "", body, ts, null),
      "Content-Type": "application/json",
    },
    body,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`get_token HTTP ${res.status}: ${JSON.stringify(data)}`);
  return data.token;
}

async function getStock(token) {
  const path = "/api/v2/stock";
  const ts = String(Math.floor(Date.now() / 1000));
  const res = await fetch(BASE + path, {
    method: "GET",
    headers: {
      "X-User-Id": env.NS_GIFTS_USER_ID,
      "X-Timestamp": ts,
      "X-Token": token,
      "X-Signature": sign("GET", path, "", Buffer.alloc(0), ts, token),
      "Content-Type": "application/json",
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`stock HTTP ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

const token = await getToken();
console.log("AUTH OK");
const stock = await getStock(token);
const cats = stock.categories || [];
let total = 0;
for (const c of cats) total += (c.services || []).length;

writeFileSync("ns-catalog.json", JSON.stringify(stock, null, 2));
console.log(`Wrote ns-catalog.json — ${cats.length} categories, ${total} services.`);
for (const c of cats) console.log(`  - ${c.category_name} (${(c.services || []).length})`);
