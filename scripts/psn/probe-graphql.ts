/**
 * Probe: is product detail data in __NEXT_DATA__ (SSR) or injected by JS?
 * Also checks if direct HTTP fetch (no browser) returns it.
 *
 * Usage:
 *   npx tsx scripts/psn/probe-graphql.ts
 */

import { chromium } from "playwright";

const CATEGORY_URL =
  "https://store.playstation.com/en-tr/category/3f772501-f6f8-49b7-abac-874a88ca4897/1";
const PRODUCT_ID = "EP9000-PPSA03208_00-GHOSTDIRECTORPS5";
const PRODUCT_URL = `https://store.playstation.com/en-tr/product/${PRODUCT_ID}`;

const NEXT_DATA_RE = /<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/;
const WCA_RE = /<script[^>]+type="application\/json"[^>]*>([\s\S]*?)<\/script>/g;

function extractAllProductFields(html: string): Record<string, unknown> {
  const merged: Record<string, unknown> = {};

  // From __NEXT_DATA__
  const ndMatch = NEXT_DATA_RE.exec(html);
  if (ndMatch?.[1]) {
    try {
      const data = JSON.parse(ndMatch[1]) as Record<string, unknown>;
      const apolloState = (data.props as Record<string, unknown>)?.apolloState as Record<string, unknown> | undefined;
      if (apolloState) {
        for (const [key, val] of Object.entries(apolloState)) {
          if (key.startsWith("Product:") && val && typeof val === "object") {
            Object.assign(merged, val as Record<string, unknown>);
          }
        }
      }
    } catch { /* skip */ }
  }

  // From WCA script tags
  for (const match of html.matchAll(WCA_RE)) {
    try {
      const blob = JSON.parse(match[1]) as Record<string, unknown>;
      const cache = blob.cache as Record<string, unknown> | undefined;
      if (!cache) continue;
      for (const [key, val] of Object.entries(cache)) {
        if (key.startsWith("Product:") && val && typeof val === "object") {
          Object.assign(merged, val as Record<string, unknown>);
        }
      }
    } catch { /* skip */ }
  }

  return merged;
}

const KEY_FIELDS = [
  "descriptions",
  "spokenLanguages",
  "screenLanguages",
  "localizedGenres",
  "publisherName",
  "releaseDate",
  "starRating",
];

function checkFields(label: string, data: Record<string, unknown>) {
  console.log(`\n[${label}]`);
  for (const f of KEY_FIELDS) {
    const val = data[f];
    const present = val !== undefined && val !== null;
    const preview = present ? JSON.stringify(val).slice(0, 100) : "(missing)";
    console.log(`  ${present ? "✓" : "✗"} ${f}: ${preview}`);
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    locale: "en-US",
    viewport: { width: 1280, height: 800 },
  });

  try {
    // ── Step 1: Akamai ────────────────────────────────────────────────────────
    console.log("Step 1: Akamai challenge…");
    const catPage = await context.newPage();
    await catPage.goto(CATEGORY_URL, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await catPage.waitForTimeout(2_500);
    console.log("  OK");
    await catPage.close();

    // ── Step 2: product page — read HTML immediately after DOMContentLoaded ───
    console.log("\nStep 2: Product page — read HTML immediately after DOM load…");
    const page = await context.newPage();
    await page.goto(PRODUCT_URL, { waitUntil: "domcontentloaded", timeout: 30_000 });
    const htmlImmediate = await page.content();
    checkFields("IMMEDIATE (no JS wait)", extractAllProductFields(htmlImmediate));

    // ── Step 3: wait for JS to finish, read again ─────────────────────────────
    console.log("\nStep 3: Waiting 5s for WCA JS, then reading again…");
    await page.waitForTimeout(5_000);
    const htmlAfterJs = await page.content();
    checkFields("AFTER 5s JS WAIT", extractAllProductFields(htmlAfterJs));

    await page.close();

    // ── Step 4: raw HTTP fetch (no browser) — can Akamai cookies bypass? ──────
    console.log("\nStep 4: Direct HTTP fetch without browser…");
    const cookies = await context.cookies("https://store.playstation.com");
    const cookieStr = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

    try {
      const res = await fetch(PRODUCT_URL, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
            "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          Cookie: cookieStr,
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });
      console.log(`  Status: ${res.status}`);
      if (res.ok) {
        const htmlDirect = await res.text();
        checkFields("DIRECT HTTP FETCH", extractAllProductFields(htmlDirect));
      } else {
        console.log("  Blocked (403/429)");
      }
    } catch (e) {
      console.log("  Error:", e);
    }

  } finally {
    await browser.close();
  }
}

main().catch(console.error);
