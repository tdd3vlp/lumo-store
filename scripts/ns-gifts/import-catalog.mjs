/**
 * Bulk-imports NS.gifts gift-card / wallet / subscription products into
 * gift_card_denominations (published), storing each item's USD wholesale cost.
 * Retail prices are derived dynamically from app_settings (USD->RUB rate +
 * markup), so this importer never writes ruble prices.
 *
 * Source of catalog data:
 *   --file <path>   read a getStock() JSON dump (for local dev)
 *   (default)       fetch live from NS.gifts — only works from the whitelisted VPS
 *
 * Options:
 *   --dry-run       parse + report, do not write to the DB
 *   --all-regions   import every region (default: only TR/US/EU/GLOBAL/RU/IN)
 *
 * Usage:
 *   node scripts/ns-gifts/import-catalog.mjs --file ns-catalog.json --dry-run
 */
import { createHash, createHmac } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import postgres from "postgres";

// ---- args ----
const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const opt = (n) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const DRY = flag("dry-run");
const ALL_REGIONS = flag("all-regions");
const FILE = opt("file");

// ---- env (DATABASE_URL, NS_GIFTS_* for live mode) ----
const env = { ...process.env };
for (const f of [".env.local", ".env"]) {
  if (!existsSync(f)) continue;
  for (const line of readFileSync(f, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && env[m[1]] === undefined) env[m[1]] = m[2];
  }
}

// ---- classification / parsing (validated against the real catalog) ----
const BRANDS = [
  [/playstation.?store wallet|playstation gift card|playstation®/i, "playstation"],
  [/steam wallet/i, "steam"],
  [/apple gift card|apple gift|itunes/i, "apple"],
  [/xbox gift card|xbox live/i, "xbox"],
  [/nintendo gift card|nintendo eshop/i, "nintendo"],
  [/google play gift/i, "googleplay"],
  [/roblox gift card/i, "roblox"],
  [/netflix gift card|netflix/i, "netflix"],
  [/spotify/i, "spotify"],
  [/riot cash/i, "riot"],
  [/razer gold/i, "razer"],
  [/battle.?net gift/i, "battlenet"],
  [/ea gift card/i, "ea"],
];
const LABEL = {
  playstation: "PlayStation", steam: "Steam", apple: "App Store",
  xbox: "Xbox", nintendo: "Nintendo", googleplay: "Google Play",
  roblox: "Roblox", netflix: "Netflix", spotify: "Spotify",
  riot: "Riot", razer: "Razer Gold", battlenet: "Battle.net", ea: "EA",
};
const CUR_REGION = {
  USD: "US", EUR: "EU", TRY: "TR", GBP: "UK", AED: "AE", BRL: "BR",
  CAD: "CA", AUD: "AU", INR: "IN", ZAR: "ZA", JPY: "JP", MXN: "MX",
  SAR: "SA", QAR: "QA", KWD: "KW", CHF: "CH", PLN: "PL", SEK: "SE",
  NOK: "NO", DKK: "DK", HKD: "HK", SGD: "SG", NZD: "NZ", CLP: "CL",
  COP: "CO", ARS: "AR", PEN: "PE", CNY: "CN", KRW: "KR", THB: "TH",
  IDR: "ID", MYR: "MY", PHP: "PH", VND: "VN", RUB: "RU", UAH: "UA",
  CZK: "CZ", HUF: "HU", RON: "RO", BGN: "BG", HRK: "HR", ILS: "IL",
  EGP: "EG", NGN: "NG", PKR: "PK", BDT: "BD", LKR: "LK", TWD: "TW",
  MAD: "MA", KES: "KE", ISK: "IS", BHD: "BH",
};
const KNOWN_CUR = new Set(Object.keys(CUR_REGION));
const SYMBOL_CUR = { "$": "USD", "€": "EUR", "£": "GBP", "₺": "TRY", "₽": "RUB", "¥": "JPY", "₹": "INR", "₩": "KRW" };
const TEXT_CUR = { TL: "TRY" };
// "Popular regions" (variant B): Turkey, US, India, Russia, UK, global, plus
// the Eurozone countries (the catalog fragments "EU" into country codes).
const ALLOWED_REGIONS = new Set([
  "TR", "US", "IN", "RU", "UK", "GLOBAL", "EU",
  "DE", "FR", "ES", "IT", "NL", "BE", "AT", "PT", "IE", "FI", "GR", "SK", "LU",
]);

function classify(catName, svcName) {
  for (const [re, pt] of BRANDS) if (re.test(catName) || re.test(svcName)) return pt;
  return null;
}
function parseAmountCurrency(name) {
  let m = name.match(/(\d+(?:[.,]\d+)?)\s*([A-Z]{3})\b/);
  if (m && (KNOWN_CUR.has(m[2]) || TEXT_CUR[m[2]])) return { amount: +m[1].replace(",", "."), currency: KNOWN_CUR.has(m[2]) ? m[2] : TEXT_CUR[m[2]] };
  m = name.match(/\b([A-Z]{3})\s*(\d+(?:[.,]\d+)?)/);
  if (m && (KNOWN_CUR.has(m[1]) || TEXT_CUR[m[1]])) return { amount: +m[2].replace(",", "."), currency: KNOWN_CUR.has(m[1]) ? m[1] : TEXT_CUR[m[1]] };
  m = name.match(/([$€£₺₽¥₹₩])\s*(\d+(?:[.,]\d+)?)/);
  if (m) return { amount: +m[2].replace(",", "."), currency: SYMBOL_CUR[m[1]] };
  m = name.match(/(\d+(?:[.,]\d+)?)\s*([$€£₺₽¥₹₩])/);
  if (m) return { amount: +m[1].replace(",", "."), currency: SYMBOL_CUR[m[2]] };
  return null;
}
function normRegion(token) {
  if (token === "GL" || token === "GLOBAL") return "GLOBAL";
  if (token === "USA") return "US";
  // Some categories name the region by its currency ("| INR", "| USD", "| PLN");
  // map that back to the country code.
  if (CUR_REGION[token]) return CUR_REGION[token];
  return token;
}
function parseRegion(catName, svcName, currency) {
  // Prefer the service name: it carries the country segment
  // ("Playstation Gift Card | IN | 1000 INR"), while the category name may only
  // carry the currency ("Playstation Gift Card | INR").
  for (const s of [svcName, catName]) {
    const m = s.match(/\|\s*([A-Z]{2,3})\s*(?:\||$)/);
    if (m) return normRegion(m[1]);
  }
  return CUR_REGION[currency] ?? "GLOBAL";
}

// ---- load catalog ----
async function loadCatalog() {
  if (FILE) return JSON.parse(readFileSync(FILE, "utf8"));
  // live fetch (VPS only)
  const BASE = env.NS_GIFTS_BASE_URL || "https://api.ns.gifts";
  const sign = (method, path, query, body, ts, token) => {
    const parts = [method, path, query, ts];
    if (token !== null) parts.push(token);
    parts.push(createHash("sha256").update(body).digest("hex"));
    return createHmac("sha256", Buffer.from(env.NS_GIFTS_API_SECRET, "base64")).update(parts.join("\n")).digest("base64");
  };
  const ts0 = String(Math.floor(Date.now() / 1000));
  const tb = Buffer.from(JSON.stringify({ login: env.NS_GIFTS_LOGIN, password: env.NS_GIFTS_PASSWORD }));
  let r = await fetch(`${BASE}/api/v2/get_token`, { method: "POST", headers: { "X-User-Id": env.NS_GIFTS_USER_ID, "X-Timestamp": ts0, "X-Signature": sign("POST", "/api/v2/get_token", "", tb, ts0, null), "Content-Type": "application/json" }, body: tb });
  const tok = (await r.json()).token;
  const ts1 = String(Math.floor(Date.now() / 1000));
  r = await fetch(`${BASE}/api/v2/stock`, { headers: { "X-User-Id": env.NS_GIFTS_USER_ID, "X-Timestamp": ts1, "X-Token": tok, "X-Signature": sign("GET", "/api/v2/stock", "", Buffer.alloc(0), ts1, tok), "Content-Type": "application/json" } });
  return r.json();
}

const stock = await loadCatalog();

// Only these 5 brands go live, with a per-brand region policy that mirrors
// lib/products/brands.ts (allowedRegions). steam/nintendo: every stocked region.
const TARGET_BRANDS = new Set(["playstation", "steam", "apple", "xbox", "nintendo"]);
const BRAND_REGIONS = {
  apple: new Set(["RU", "US", "TR"]),
  playstation: new Set(["TR", "IN", "US", "PL", "UK"]),
  xbox: new Set(["US", "TR", "EU"]),
};

// ---- parse + filter + dedup ----
const byKey = new Map();
let matched = 0, regionFiltered = 0;
for (const cat of stock.categories) {
  const keys = (cat.fields || []).map((f) => f.key);
  const codeType = keys.length === 0 || keys.every((k) => k === "quantity");
  if (!codeType) continue;
  for (const svc of cat.services) {
    const pt = classify(cat.category_name, svc.service_name);
    if (!pt || !TARGET_BRANDS.has(pt)) continue;
    const ac = parseAmountCurrency(svc.service_name);
    if (!ac) continue;
    const region = parseRegion(cat.category_name, svc.service_name, ac.currency);
    matched++;
    const brandRegions = BRAND_REGIONS[pt];
    if (brandRegions && !brandRegions.has(region)) { regionFiltered++; continue; }
    const k = `${pt}|${region}|${ac.currency}|${ac.amount}`;
    const row = {
      pt, region, currency: ac.currency, amount: ac.amount,
      usd: svc.price, serviceId: svc.service_id,
      inStock: Number(svc.in_stock) || 0,
      displayName: `${LABEL[pt]} ${ac.amount % 1 === 0 ? ac.amount : ac.amount} ${ac.currency}`,
    };
    // Dedup a denomination to one service: prefer one that's actually in stock,
    // then the cheapest.
    const prev = byKey.get(k);
    const better =
      !prev ||
      (row.inStock > 0 && prev.inStock <= 0) ||
      (row.inStock > 0 === prev.inStock > 0 && row.usd < prev.usd);
    if (better) byKey.set(k, row);
  }
}

const rows = [...byKey.values()];
const perType = {};
let publishable = 0;
for (const r of rows) {
  perType[r.pt] = perType[r.pt] || { inStock: 0, out: 0 };
  if (r.inStock > 0) { perType[r.pt].inStock++; publishable++; } else perType[r.pt].out++;
}
console.log(`matched (target brands, code): ${matched}, region-filtered out: ${regionFiltered}, unique: ${rows.length}, publishable (in stock): ${publishable}`);
console.log("per product_type (in stock / out):", JSON.stringify(perType));

if (DRY) {
  console.log("--- dry run, sample ---");
  for (const r of rows.slice(0, 15)) console.log(`  ${r.pt} ${r.region} ${r.amount} ${r.currency} usd=${r.usd} stock=${r.inStock} «${r.displayName}»`);
  process.exit(0);
}

// ---- write ----
if (!env.DATABASE_URL) { console.error("DATABASE_URL missing"); process.exit(1); }
const sql = postgres(env.DATABASE_URL, { max: 4, prepare: false });
// is_published tracks NS.gifts availability: only in-stock denominations are
// sellable. First unpublish every NS-sourced denomination, then republish only
// the ones in stock below — so the published set is exactly what NS can fulfil
// right now (drops stale rows and items NS no longer lists). This is NOT a
// real-time guarantee; a purchase-time stock check is still required before
// charging.
await sql`UPDATE gift_card_denominations SET is_published = false WHERE ns_gifts_service_id IS NOT NULL`;
let published = 0, unpublished = 0;
for (const r of rows) {
  const isPublished = r.inStock > 0;
  if (isPublished) published++; else unpublished++;
  await sql`
    INSERT INTO gift_card_denominations
      (region, currency, amount_minor, product_type, display_name, cost_usd, ns_gifts_service_id, is_published, active)
    VALUES (${r.region}, ${r.currency}, ${Math.round(r.amount * 100)}, ${r.pt}, ${r.displayName}, ${r.usd}, ${r.serviceId}, ${isPublished}, true)
    ON CONFLICT (region, currency, amount_minor, product_type) DO UPDATE SET
      display_name = EXCLUDED.display_name,
      cost_usd = EXCLUDED.cost_usd,
      ns_gifts_service_id = EXCLUDED.ns_gifts_service_id,
      is_published = EXCLUDED.is_published,
      active = true
  `;
}
console.log(`Synced ${rows.length} denominations — published (in stock): ${published}, unpublished (out of stock): ${unpublished}.`);
await sql.end();
