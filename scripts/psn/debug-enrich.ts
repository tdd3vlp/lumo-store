import "../env";
import { PsnBrowserClient, parseProductDetailHtml } from "../../lib/psn/browser-client";

const CATEGORY_URL = "https://store.playstation.com/en-tr/category/3f772501-f6f8-49b7-abac-874a88ca4897/1";
const PRODUCT_URL = "https://store.playstation.com/en-tr/product/EP9000-PPSA03208_00-GHOSTDIRECTORPS5";

async function main() {
  const browser = new PsnBrowserClient();
  await browser.launch();
  await browser.initSession(CATEGORY_URL);
  console.log("Session OK");

  const ctx = (browser as unknown as Record<string, unknown>)["context"] as import("playwright").BrowserContext;

  const resp = await ctx.request.get(PRODUCT_URL, {
    headers: { Accept: "text/html,*/*", Referer: "https://store.playstation.com/" },
  });
  console.log("Status:", resp.status());
  const html = await resp.text();
  console.log("HTML length:", html.length);
  console.log("Has __NEXT_DATA__:", html.includes("__NEXT_DATA__"));
  console.log("Has descriptions:", html.includes('"descriptions"'));
  console.log("Has localizedGenres:", html.includes('"localizedGenres"'));
  console.log("Has starRating:", html.includes('"starRating"'));
  console.log("Has spokenLanguages:", html.includes('"spokenLanguages"'));

  if (!html.includes("__NEXT_DATA__")) {
    console.log("\nFirst 1000 chars:");
    console.log(html.slice(0, 1000));
  } else {
    // Manual Apollo state inspection
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (match) {
      const data = JSON.parse(match[1]) as Record<string, unknown>;
      const apollo = (data.props as Record<string, unknown>)?.apolloState as Record<string, unknown> ?? {};
      const keys = Object.keys(apollo);
      console.log("\nApollo keys count:", keys.length);
      const productKeys = keys.filter(k => k.startsWith("Product:")).slice(0, 5);
      console.log("Product keys:", productKeys);
      for (const pk of productKeys) {
        const pv = apollo[pk] as Record<string, unknown>;
        const fields = Object.keys(pv);
        console.log(`\n${pk} fields:`, fields);
        // Show specific fields we care about
        for (const f of ["descriptions", "localizedGenres", "starRating", "spokenLanguages", "screenLanguages", "media", "publisherName"]) {
          if (f in pv) {
            const v = pv[f];
            const str = JSON.stringify(v);
            console.log(`  ${f}:`, str.slice(0, 300));
          }
        }
      }
      // Check other key types
      console.log("\nOther key prefixes (first 10):");
      const nonProduct = keys.filter(k => !k.startsWith("Product:")).slice(0, 10);
      console.log(nonProduct);
    }
    try {
      const data = parseProductDetailHtml(html);
      console.log("\nParsed:", {
        id: data.id,
        genres: data.genres,
        rating: data.rating,
        voices: data.voiceLanguages.slice(0, 3),
        subs: data.subtitleLanguages.slice(0, 3),
        screenshots: data.screenshotUrls.length,
      });
      console.log("Desc:", data.longDescriptionHtml?.slice(0, 100) ?? null);
    } catch (e) {
      console.log("Parse error:", e);
    }
  }

  await browser.close();
}

main().catch(console.error);
