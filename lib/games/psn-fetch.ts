// Not marked "server-only": pure fetch/parse logic (no DB, no secrets) reused by
// the periodic refresh CLI (scripts/psn/refresh-games.ts) as well as server code.
import type { Game } from "./catalog";
import { GAME_REGION_CURRENCY, sortEditions } from "./catalog";

// Server-side port of scripts/psn/game-prices.mjs. Given any PSN store product
// or concept URL, resolves the game's global Concept id, reads that concept page
// in every region's locale (incl. en-us, whose SKU prefix differs and can't be
// derived from Europe's), and returns a Game with per-region store prices plus a
// clean 16:9 cover URL. store.playstation.com serves all this in static HTML, so
// a plain fetch is enough — no browser, no Akamai session.

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

// Region → store locale. Mirrors GAME_REGION_CURRENCY in catalog.ts.
const LOCALES: Record<string, string> = {
  TR: "en-tr",
  IN: "en-in",
  US: "en-us",
  PL: "en-pl",
};

// How each region's store formats numbers: "3.199,00 TL" vs "$1,299.99".
const COMMA_DECIMAL = new Set(["TR", "PL"]);

const COVER_WIDTH = 1920;

async function get(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
  return res.ok ? await res.text() : "";
}

function nextData(html: string): string {
  const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  return m ? m[1] : "";
}

function conceptId(html: string): string | null {
  const m = html.match(/Concept:(\d+)/);
  return m ? m[1] : null;
}

/** SKU tail → price string, e.g. { CODMW4VAULT00001: "4.399,00 TL" }. */
function pricesBySkuTail(html: string): Record<string, string> {
  const s = nextData(html);
  const out: Record<string, string> = {};
  const re =
    /GameCTA:[A-Z_]+:BUY_NOW:(?:EP|UP|JP|HP)[0-9]{4}-[A-Z0-9]+_00-([A-Z0-9]+)-[A-Z0-9]+:OUTRIGHT[\s\S]{0,400}?\\"priceOrText\\":\\"([^\\"]{1,20})\\"/g;
  for (const m of s.matchAll(re)) {
    if (!out[m[1]]) out[m[1]] = m[2];
  }
  return out;
}

// Content-rating codes (ESRB_MATURE, PEGI_16, USK_18, …). A Product object nests
// its rating as `contentRating:{name:"PEGI_16"}` BEFORE its own display name, so
// the first "name" we hit is often the rating — skip those.
const RATING_CODE =
  /^(?:ESRB|PEGI|USK|CERO|ACB|GRAC|RARS|IARC|BBFC|CLASS_IND|OFLC|DEJUS)[_A-Z0-9]*$/;

/**
 * SKU tail → the product's display name, e.g.
 * { NHL27STANDEDITON: "NHL® 27 Standard Edition PS5" }. Far more reliable than
 * guessing the edition from the SKU tail, which is abbreviated inconsistently
 * ("NHL27STANDEDITON", "CODMW4STANDARD01", …). Scans each Product block for the
 * first "name" that isn't a content-rating code.
 */
function productNamesBySkuTail(html: string): Record<string, string> {
  const s = nextData(html);
  const out: Record<string, string> = {};
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

/** "3.199,00 TL" → 3199 ; "$69.99" → 69.99 ; "Rs 5,999" → 5999. */
function parseAmount(text: string, region: string): number | null {
  let n = text.replace(/[^0-9.,]/g, "");
  if (COMMA_DECIMAL.has(region)) n = n.replace(/\./g, "").replace(",", ".");
  else n = n.replace(/,/g, "");
  const v = Number.parseFloat(n);
  return Number.isFinite(v) ? v : null;
}

// A concept page's <title> is sometimes a specific edition's product name
// ("NHL® 27 Deluxe Edition PS5"), so strip a trailing platform suffix and
// "… Edition" to recover the bare game title ("NHL 27").
/** SKU tail → full product id ("...NHL27STANDEDITON" → "UP0006-PPSA34063_00-NHL27STANDEDITON"). */
function productIdsBySkuTail(html: string): Record<string, string> {
  const s = nextData(html);
  const out: Record<string, string> = {};
  const re = /Product:((?:EP|UP|JP|HP)[0-9]{4}-[A-Z0-9]+_00-([A-Z0-9]+))\\":\{/g;
  for (const m of s.matchAll(re)) {
    if (!out[m[2]]) out[m[2]] = m[1];
  }
  return out;
}

function stripHtml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** The LONG store description (raw text), or "" — from a concept/product page. */
function longDescriptionOf(html: string): string {
  const s = nextData(html);
  const m = s.match(/\\"type\\":\\"LONG\\",\\"value\\":\\"((?:[^\\"]|\\.)*?)\\"\}/);
  if (!m) return "";
  // The value is a JSON-escaped string; decode common escapes.
  const decoded = m[1]
    .replace(/\\r/g, "")
    .replace(/\\n/g, "\n")
    .replace(/\\u003c/g, "<")
    .replace(/\\u003e/g, ">")
    .replace(/\\u0026/g, "&")
    .replace(/\\\\/g, "\\")
    .replace(/\\"/g, '"');
  return stripHtml(decoded);
}

function stripEditionAndPlatform(s: string): string {
  let out = s;
  out = out.replace(/\s*(?:for\s+)?ps5(?:\s*&\s*ps4)?\s*$/i, "").replace(/\s*(?:for\s+)?ps4\s*$/i, "").trim();
  out = out.replace(
    /\s*[-–—:]?\s*(?:standard|digital\s+deluxe|deluxe|ultimate|premium|vault|gold|cross-?gen|game of the year|goty)?\s*edition\s*$/i,
    "",
  );
  out = out.replace(/\s*(?:for\s+)?ps5(?:\s*&\s*ps4)?\s*$/i, "").replace(/\s*(?:for\s+)?ps4\s*$/i, "");
  return out.trim();
}

function titleOf(html: string): string {
  const m = html.match(/<title>([^<]*)<\/title>/);
  if (!m) return "";
  const raw = m[1]
    .replace(/\s*\|\s*PlayStation.*$/i, "")
    .replace(/[®™©]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return stripEditionAndPlatform(raw);
}

function releaseOf(html: string): string {
  const s = nextData(html);
  // PSN stores the release day's LOCAL midnight as a UTC timestamp, so e.g. a
  // Turkey (+3) release reads "…-18T21:00:00Z" — its UTC date is a day early.
  // Shift by +12h before taking the date to recover the intended calendar day
  // for any region offset.
  const ts = s.match(/\\"releaseDate\\":\\"([0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]+Z?)/);
  if (ts) {
    const shifted = new Date(new Date(ts[1]).getTime() + 12 * 3600 * 1000);
    if (!Number.isNaN(shifted.getTime())) return shifted.toISOString().slice(0, 10);
  }
  const d = s.match(/\\"releaseDate\\":\\"([0-9]{4}-[0-9]{2}-[0-9]{2})/);
  return d ? d[1] : "";
}

/**
 * 16:9 hero art for the game card. GAMEHUB_COVER_ART is the game-hub key art —
 * the actual characters/scene, no baked-in title (we overlay our own) — and is
 * present and good far more reliably than BACKGROUND, which for some games is a
 * blank grey gradient or a plain skyline. BACKGROUND / SIXTEEN_BY_NINE_BANNER /
 * MASTER are fallbacks only.
 */
function coverOf(html: string): string | null {
  const s = nextData(html);
  const byRole: Record<string, string> = {};
  for (const m of s.matchAll(/\\"role\\":\\"([A-Z_]+)\\",\\"type\\":\\"IMAGE\\",\\"url\\":\\"([^\\"]+)\\"/g)) {
    if (!byRole[m[1]]) byRole[m[1]] = m[2];
  }
  for (const m of s.matchAll(/\\"type\\":\\"IMAGE\\",\\"url\\":\\"([^\\"]+)\\",\\"role\\":\\"([A-Z_]+)\\"/g)) {
    if (!byRole[m[2]]) byRole[m[2]] = m[1];
  }
  return (
    byRole.GAMEHUB_COVER_ART ??
    byRole.BACKGROUND ??
    byRole.SIXTEEN_BY_NINE_BANNER ??
    byRole.MASTER ??
    null
  );
}

// SKU-tail roots as a last resort when a product has no display name. Ordered
// longest-first so "STANDARD" wins over "STAND". Tails abbreviate the word
// inconsistently (STANDARD, STAND, DELUXE, DELUX, …), hence the short variants.
const EDITION_ROOTS: Array<[RegExp, string]> = [
  [/STANDARD|STAND/, "Standard"],
  [/DELUXE|DELUX/, "Deluxe"],
  [/ULTIMATE|ULTIM/, "Ultimate"],
  [/PREMIUM|PREM/, "Premium"],
  [/CROSSGEN|CROSS/, "Cross-Gen"],
  [/DIGITAL|DIGIT/, "Digital"],
  [/VAULT/, "Vault"],
  [/GOLD/, "Gold"],
];

/**
 * Human edition label for one SKU. Prefers the store's product name (e.g.
 * "NHL® 27 Standard Edition PS5" → "Standard Edition") by stripping the game
 * title and platform suffix; falls back to a root match on the SKU tail.
 */
function editionName(tail: string, productName: string | undefined, title: string): string {
  if (productName && !RATING_CODE.test(productName)) {
    let s = productName.replace(/[®™©]/g, "").replace(/\s+/g, " ").trim();
    // Drop a trailing platform suffix: "… PS5", "… PS4", "… PS5 & PS4".
    s = s.replace(/\s*(?:for\s+)?ps5(?:\s*&\s*ps4)?\s*$/i, "").replace(/\s*(?:for\s+)?ps4\s*$/i, "").trim();
    // Drop the leading game title if the name starts with it.
    const t = title.replace(/[®™©]/g, "").replace(/\s+/g, " ").trim();
    if (t && s.toLowerCase().startsWith(t.toLowerCase())) s = s.slice(t.length).trim();
    s = s.replace(/^[-–—:]\s*/, "").trim();
    if (s) return s;
  }
  const hit = EDITION_ROOTS.find(([re]) => re.test(tail));
  return hit ? `${hit[1]} Edition` : "Standard Edition";
}

// Some SKUs aren't full editions — an upgrade (Standard→Deluxe), a season pass,
// a currency/bonus pack. They have low prices and, left in, get mislabeled as a
// duplicate "Standard Edition" that the min-price dedupe then picks. Drop them.
function isNonEdition(tail: string, name: string | undefined): boolean {
  const t = tail.toUpperCase();
  if (/UPGRADE|UPGRD|UPGADE|SEASONPASS|SEASON PASS|BONUS|CURRENCY|POINTS|PACK\b/.test(t)) return true;
  return name != null && /\b(upgrade|season pass|bonus|currency|points)\b/i.test(name);
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[®™©]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export class PsnFetchError extends Error {}

export type FetchedGame = Game & {
  /** Global concept id — resolves the game in any locale (incl. ru-ua). */
  conceptId: string;
  /** Edition name → a full product id, for fetching that edition's ru-ua page. */
  editionProductIds: Record<string, string>;
};

/** Parse a PSN store URL into a Game (per-region store prices + cover URL). */
export async function fetchPsnGame(url: string): Promise<FetchedGame> {
  let first: string;
  try {
    first = await get(url);
  } catch {
    throw new PsnFetchError("Не удалось открыть ссылку PlayStation Store.");
  }
  if (!first) throw new PsnFetchError("Страница недоступна — проверьте ссылку.");

  const cid = conceptId(first);
  if (!cid) throw new PsnFetchError("Это не похоже на ссылку товара PlayStation Store.");

  const byRegion: Record<string, Record<string, string>> = {};
  const namesByTail: Record<string, string> = {};
  const idsByTail: Record<string, string> = {};
  let title = "";
  let release = "";
  let cover: string | null = null;

  for (const [region, loc] of Object.entries(LOCALES)) {
    const html = await get(`https://store.playstation.com/${loc}/concept/${cid}`);
    if (!html) continue;
    const prices = pricesBySkuTail(html);
    if (Object.keys(prices).length === 0) continue; // not sold in this region
    byRegion[region] = prices;
    for (const [tail, name] of Object.entries(productNamesBySkuTail(html))) {
      if (!namesByTail[tail]) namesByTail[tail] = name;
    }
    for (const [tail, id] of Object.entries(productIdsBySkuTail(html))) {
      if (!idsByTail[tail]) idsByTail[tail] = id;
    }
    if (!title) title = titleOf(html);
    if (!release) release = releaseOf(html);
    if (!cover) cover = coverOf(html);
  }

  const tails = [...new Set(Object.values(byRegion).flatMap((r) => Object.keys(r)))];
  if (tails.length === 0 || !title) {
    throw new PsnFetchError("Не удалось получить цены — возможно, игра ещё не в продаже.");
  }
  if (!cover) throw new PsnFetchError("Не удалось получить обложку игры.");

  const parsed = tails
    .filter((tail) => !isNonEdition(tail, namesByTail[tail]))
    .map((tail) => {
      const prices: Record<string, number> = {};
      for (const [region, map] of Object.entries(byRegion)) {
        // Only keep regions we actually price cards in.
        if (!(region in GAME_REGION_CURRENCY) || !map[tail]) continue;
        const v = parseAmount(map[tail], region);
        if (v != null) prices[region] = v;
      }
      return { name: editionName(tail, namesByTail[tail], title), prices, tail };
    })
    .filter((e) => Object.keys(e.prices).length > 0);

  // A game can list several SKUs that resolve to the same edition name (e.g. a
  // PS4 and PS5 "Standard Edition"). Merge them into one, keeping the cheapest
  // price per region, so the UI never shows duplicate edition buttons.
  const byName = new Map<string, Record<string, number>>();
  const editionProductIds: Record<string, string> = {};
  for (const e of parsed) {
    const acc = byName.get(e.name) ?? {};
    for (const [region, price] of Object.entries(e.prices)) {
      acc[region] = acc[region] == null ? price : Math.min(acc[region], price);
    }
    byName.set(e.name, acc);
    if (!editionProductIds[e.name] && idsByTail[e.tail]) editionProductIds[e.name] = idsByTail[e.tail];
  }
  const editions = [...byName.entries()].map(([name, prices]) => ({ name, prices }));

  if (editions.length === 0) {
    throw new PsnFetchError("Нет цен в поддерживаемых регионах (US, TR, PL, UK, IN).");
  }

  return {
    conceptId: cid,
    editionProductIds,
    slug: slugify(title),
    title,
    platform: "PS5",
    releaseDate: release,
    cover: `${cover}?w=${COVER_WIDTH}`,
    editions: sortEditions(editions),
  };
}

export type RussianDescriptions = {
  /** The game's overall description in Russian (HTML-stripped). */
  game: string;
  /** Edition name → that edition's Russian description (for non-Standard ones). */
  editions: Record<string, string>;
};

/**
 * Russian store text for AI: the game description from the ru-ua concept page,
 * and each non-Standard edition's description from its ru-ua product page. All
 * best-effort — missing pieces come back as "".
 */
export async function fetchRussianDescriptions(
  conceptId: string,
  editionProductIds: Record<string, string>,
): Promise<RussianDescriptions> {
  const conceptHtml = await get(`https://store.playstation.com/ru-ua/concept/${conceptId}`);
  const game = conceptHtml ? longDescriptionOf(conceptHtml) : "";

  const editions: Record<string, string> = {};
  for (const [name, productId] of Object.entries(editionProductIds)) {
    if (/\bstandard\b/i.test(name)) continue; // Standard needs no "extras" list.
    const html = await get(`https://store.playstation.com/ru-ua/product/${productId}`);
    if (html) editions[name] = longDescriptionOf(html);
  }
  return { game, editions };
}
