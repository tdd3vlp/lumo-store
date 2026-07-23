/**
 * PSN game price probe — prints a ready-to-paste GAMES entry for lib/games/catalog.ts.
 *
 *   node scripts/psn/game-prices.mjs <any PSN store product or concept URL>
 *
 * e.g. node scripts/psn/game-prices.mjs \
 *        'https://store.playstation.com/en-tr/product/EP0002-PPSA07950_00-CODMW4STANDARD01'
 *
 * How it works: any product URL carries a global `Concept:<id>`. The concept
 * page exists in every locale — including en-us, whose SKU prefix (UP…) differs
 * from Europe's (EP…) and cannot be derived from it — so we resolve the concept
 * once and then read each locale's concept page. Editions are matched across
 * regions by their SKU tail (e.g. CODMW4VAULT00001), which is region-stable.
 *
 * Prices live in the Apollo cache embedded in __NEXT_DATA__ under
 * `GameCTA:…:BUY_NOW:<sku>:OUTRIGHT` → `local.priceOrText`, already formatted in
 * the region's currency. Store.playstation.com serves this in static HTML, so a
 * plain fetch is enough — no browser, no Akamai session needed.
 *
 * The 16:9 store banner is downloaded straight into public/banners/, so adding a
 * game is paste-the-block-and-done — no hunting for artwork.
 *
 * Zero dependencies. Run from the project root.
 */

import { writeFile } from "node:fs/promises";
import path from "node:path";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

// Region → store locale. Mirrors GAME_REGION_CURRENCY in lib/games/catalog.ts.
const LOCALES = { TR: "en-tr", IN: "en-in", US: "en-us", PL: "en-pl", UK: "en-gb" };

// How each region's store formats numbers: "3.199,00 TL" vs "$1,299.99".
const COMMA_DECIMAL = new Set(["TR", "PL"]);

async function get(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
  return res.ok ? await res.text() : "";
}

function nextData(html) {
  const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  return m ? m[1] : "";
}

function conceptId(html) {
  const m = html.match(/Concept:(\d+)/);
  return m ? m[1] : null;
}

/** SKU tail → price string, e.g. { CODMW4VAULT00001: "4.399,00 TL" }. */
function pricesBySkuTail(html) {
  const s = nextData(html);
  const out = {};
  const re =
    /GameCTA:[A-Z_]+:BUY_NOW:(?:EP|UP|JP|HP)[0-9]{4}-[A-Z0-9]+_00-([A-Z0-9]+)-[A-Z0-9]+:OUTRIGHT[\s\S]{0,400}?\\"priceOrText\\":\\"([^\\"]{1,20})\\"/g;
  for (const m of s.matchAll(re)) {
    if (!out[m[1]]) out[m[1]] = m[2];
  }
  return out;
}

// Content-rating codes nested before a product's own name — skip them.
const RATING_CODE =
  /^(?:ESRB|PEGI|USK|CERO|ACB|GRAC|RARS|IARC|BBFC|CLASS_IND|OFLC|DEJUS)[_A-Z0-9]*$/;

// SKU tail → product display name ("NHL27STANDEDITON" → "NHL® 27 Standard Edition PS5").
function productNamesBySkuTail(html) {
  const s = nextData(html);
  const out = {};
  const re = /Product:(?:EP|UP|JP|HP)[0-9]{4}-[A-Z0-9]+_00-([A-Z0-9]+)\\":\{([\s\S]{0,600})/g;
  for (const m of s.matchAll(re)) {
    const tail = m[1];
    if (out[tail]) continue;
    for (const nm of m[2].matchAll(/\\"name\\":\\"([^\\"]{1,90})\\"/g)) {
      if (RATING_CODE.test(nm[1])) continue;
      out[tail] = nm[1];
      break;
    }
  }
  return out;
}

function stripEditionAndPlatform(s) {
  let out = s;
  out = out.replace(/\s*(?:for\s+)?ps5(?:\s*&\s*ps4)?\s*$/i, "").replace(/\s*(?:for\s+)?ps4\s*$/i, "").trim();
  out = out.replace(
    /\s*[-–—:]?\s*(?:standard|digital\s+deluxe|deluxe|ultimate|premium|vault|gold|cross-?gen|game of the year|goty)?\s*edition\s*$/i,
    "",
  );
  out = out.replace(/\s*(?:for\s+)?ps5(?:\s*&\s*ps4)?\s*$/i, "").replace(/\s*(?:for\s+)?ps4\s*$/i, "");
  return out.trim();
}

/** "3.199,00 TL" → 3199 ; "$69.99" → 69.99 ; "Rs 5,999" → 5999. */
function parseAmount(text, region) {
  let n = text.replace(/[^0-9.,]/g, "");
  if (COMMA_DECIMAL.has(region)) n = n.replace(/\./g, "").replace(",", ".");
  else n = n.replace(/,/g, "");
  const v = Number.parseFloat(n);
  return Number.isFinite(v) ? v : null;
}

function titleOf(html) {
  const m = html.match(/<title>([^<]*)<\/title>/);
  if (!m) return "";
  // Trademark glyphs bloat the title; a concept <title> can also be a specific
  // edition ("NHL® 27 Deluxe Edition PS5") — strip both to get the bare title.
  const raw = m[1]
    .replace(/\s*\|\s*PlayStation.*$/i, "")
    .replace(/[®™©]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return stripEditionAndPlatform(raw);
}

function releaseOf(html) {
  const s = nextData(html);
  // PSN stores the release day's LOCAL midnight as a UTC timestamp, so a Turkey
  // (+3) release reads "…-22T21:00:00Z" — its UTC date is a day early. Shift by
  // +12h before taking the date to recover the intended calendar day for any
  // region offset. Mirror of releaseOf() in lib/games/psn-fetch.ts.
  const ts = s.match(/\\"releaseDate\\":\\"([0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]+Z?)/);
  if (ts) {
    const shifted = new Date(new Date(ts[1]).getTime() + 12 * 3600 * 1000);
    if (!Number.isNaN(shifted.getTime())) return shifted.toISOString().slice(0, 10);
  }
  const m = s.match(/\\"releaseDate\\":\\"([0-9]{4}-[0-9]{2}-[0-9]{2})/);
  return m ? m[1] : null;
}

/**
 * Store media is tagged with a role. We overlay our own title on the cover, so
 * we want the clean 16:9 hero backdrop — role BACKGROUND — which carries no
 * baked-in game title. SIXTEEN_BY_NINE_BANNER and MASTER are marketing key art
 * with the logo/title burned in and would clash with our overlay, so they're
 * last-resort fallbacks. GAMEHUB_COVER_ART is also a clean 16:9 backdrop.
 */
function coverOf(html) {
  const s = nextData(html);
  const byRole = {};
  // The two key orders the payload uses for a media entry.
  for (const m of s.matchAll(/\\"role\\":\\"([A-Z_]+)\\",\\"type\\":\\"IMAGE\\",\\"url\\":\\"([^\\"]+)\\"/g)) {
    byRole[m[1]] ??= m[2];
  }
  for (const m of s.matchAll(/\\"type\\":\\"IMAGE\\",\\"url\\":\\"([^\\"]+)\\",\\"role\\":\\"([A-Z_]+)\\"/g)) {
    byRole[m[2]] ??= m[1];
  }
  return (
    byRole.GAMEHUB_COVER_ART ??
    byRole.BACKGROUND ??
    byRole.SIXTEEN_BY_NINE_BANNER ??
    byRole.MASTER ??
    null
  );
}

// The store serves 4K masters (~900KB). The banner never renders wider than a
// ~640px column, so we ask the image API to downscale — same picture, a third
// of the bytes in the repo.
const COVER_WIDTH = 1920;

async function download(url, dest) {
  const res = await fetch(`${url}?w=${COVER_WIDTH}`, { headers: { "User-Agent": UA } });
  if (!res.ok) return false;
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buf);
  return true;
}

/** CODMW4VAULT00001 → "Vault Edition". Falls back to the raw tail. */
// SKU-tail roots, longest-first, as a fallback when a product has no name.
const EDITION_ROOTS = [
  [/STANDARD|STAND/, "Standard"],
  [/DELUXE|DELUX/, "Deluxe"],
  [/ULTIMATE|ULTIM/, "Ultimate"],
  [/PREMIUM|PREM/, "Premium"],
  [/CROSSGEN|CROSS/, "Cross-Gen"],
  [/DIGITAL|DIGIT/, "Digital"],
  [/VAULT/, "Vault"],
  [/GOLD/, "Gold"],
];

// Prefer the store product name ("NHL® 27 Standard Edition PS5" → "Standard
// Edition") over guessing from the abbreviated SKU tail.
function editionName(tail, productName, title) {
  if (productName && !RATING_CODE.test(productName)) {
    let s = productName.replace(/[®™©]/g, "").replace(/\s+/g, " ").trim();
    s = s.replace(/\s*(?:for\s+)?ps5(?:\s*&\s*ps4)?\s*$/i, "").replace(/\s*(?:for\s+)?ps4\s*$/i, "").trim();
    const t = (title || "").replace(/[®™©]/g, "").replace(/\s+/g, " ").trim();
    if (t && s.toLowerCase().startsWith(t.toLowerCase())) s = s.slice(t.length).trim();
    s = s.replace(/^[-–—:]\s*/, "").trim();
    if (s) return s;
  }
  const hit = EDITION_ROOTS.find(([re]) => re.test(tail));
  return hit ? `${hit[1]} Edition` : "Standard Edition";
}

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[®™©]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

const url = process.argv[2];
if (!url) {
  console.error("usage: node scripts/psn/game-prices.mjs <PSN store URL>");
  process.exit(1);
}

const first = await get(url);
if (!first) {
  console.error("Could not fetch that URL.");
  process.exit(1);
}
const cid = conceptId(first);
if (!cid) {
  console.error("No Concept id on that page — is it a store product/concept URL?");
  process.exit(1);
}
console.error(`concept ${cid}`);

const byRegion = {};
const namesByTail = {};
let title = "";
let release = null;
let cover = null;

for (const [region, loc] of Object.entries(LOCALES)) {
  const html = await get(`https://store.playstation.com/${loc}/concept/${cid}`);
  if (!html) {
    console.error(`  ${region}: fetch failed — skipped`);
    continue;
  }
  const prices = pricesBySkuTail(html);
  if (Object.keys(prices).length === 0) {
    console.error(`  ${region}: no prices — not sold in this region, skipped`);
    continue;
  }
  byRegion[region] = prices;
  for (const [tail, name] of Object.entries(productNamesBySkuTail(html))) {
    if (!namesByTail[tail]) namesByTail[tail] = name;
  }
  if (!title) title = titleOf(html);
  if (!release) release = releaseOf(html);
  if (!cover) cover = coverOf(html);
  console.error(`  ${region}: ${Object.keys(prices).length} editions`);
}

// Keep editions that priced in at least one region; regions missing an edition
// simply don't appear in its prices map — pricing.ts already skips those.
const tails = [...new Set(Object.values(byRegion).flatMap((r) => Object.keys(r)))];
if (tails.length === 0) {
  console.error("No editions found.");
  process.exit(1);
}

// Drop non-editions (upgrades, season passes, currency/bonus packs) that would
// otherwise mislabel as a cheap duplicate "Standard Edition".
const isNonEdition = (tail, name) =>
  /UPGRADE|UPGRD|UPGADE|SEASONPASS|SEASON PASS|BONUS|CURRENCY|POINTS|PACK\b/.test(tail.toUpperCase()) ||
  (name != null && /\b(upgrade|season pass|bonus|currency|points)\b/i.test(name));

const parsed = tails
  .filter((tail) => !isNonEdition(tail, namesByTail[tail]))
  .map((tail) => {
    const prices = {};
    for (const [region, map] of Object.entries(byRegion)) {
      if (!map[tail]) continue;
      const v = parseAmount(map[tail], region);
      if (v != null) prices[region] = v;
    }
    return { name: editionName(tail, namesByTail[tail], title), prices };
  });

// Merge SKUs that resolve to the same edition name, cheapest price per region.
const byName = new Map();
for (const e of parsed) {
  const acc = byName.get(e.name) ?? {};
  for (const [region, price] of Object.entries(e.prices)) {
    acc[region] = acc[region] == null ? price : Math.min(acc[region], price);
  }
  byName.set(e.name, acc);
}
const editions = [...byName.entries()].map(([name, prices]) => ({ name, prices }));

// Standard first, then editions with add-ons (mirrors editionRank in catalog.ts).
function editionRank(name) {
  const n = name.toLowerCase();
  if (/\bstandard\b/.test(n)) return 0;
  if (/cross-?gen/.test(n)) return 1;
  if (/\bdigital deluxe\b/.test(n)) return 4;
  if (/\bdeluxe\b/.test(n)) return 3;
  if (/\bgold\b/.test(n)) return 5;
  if (/\bpremium\b/.test(n)) return 6;
  if (/\bultimate\b/.test(n)) return 7;
  if (/\bvault\b/.test(n)) return 8;
  if (/\bdigital\b/.test(n)) return 1;
  return 2;
}
editions.sort((a, b) => editionRank(a.name) - editionRank(b.name));

const fmt = (o) =>
  "{ " +
  Object.entries(o)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ") +
  " }";

const slug = slugify(title);
const ext = cover ? (path.extname(new URL(cover).pathname) || ".jpg") : ".jpg";
const coverPath = `/banners/game-${slug}${ext}`;

if (cover) {
  const dest = path.join(process.cwd(), "public", "banners", `game-${slug}${ext}`);
  const ok = await download(cover, dest);
  console.error(ok ? `\ncover saved → public${coverPath}` : `\ncover download FAILED: ${cover}`);
} else {
  console.error("\nno 16:9 banner found — set `cover` by hand");
}

console.error("\n--- paste into GAMES in lib/games/catalog.ts ---\n");
console.log(`  {
    slug: ${JSON.stringify(slug)},
    title: ${JSON.stringify(title)},
    platform: "PS5",
    releaseDate: ${JSON.stringify(release ?? "TODO")},
    cover: ${JSON.stringify(coverPath)},
    editions: [
${editions.map((e) => `      { name: ${JSON.stringify(e.name)}, prices: ${fmt(e.prices)} },`).join("\n")}
    ],
  },`);
