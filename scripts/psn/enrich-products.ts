/**
 * Enrich already-imported PSN products in two passes:
 *
 *  1. PSN pass  — fetches individual product pages (en-tr + ru-ua) to get
 *     description, publisher, release date, genres, rating, voice/subtitle
 *     languages, and screenshots.
 *
 *  2. AI pass   — calls OpenAI GPT-4o-mini for products that still lack a
 *     Russian description or have no short summary. Produces:
 *       • description_ai_ru_text    – full Russian translation (when ru-ua unavailable)
 *       • description_ai_summary_ru – 1-2 sentence storefront summary in Russian
 *
 * Usage:
 *   DATABASE_URL=... OPENAI_API_KEY=... npx tsx scripts/psn/enrich-products.ts
 *   DATABASE_URL=... npx tsx scripts/psn/enrich-products.ts --phase=psn
 *   DATABASE_URL=... OPENAI_API_KEY=... npx tsx scripts/psn/enrich-products.ts --phase=ai
 *
 * Flags:
 *   --phase=psn|ai|all   default: all
 *   --region=TR|UA|ALL   default: ALL (currently only TR is scraped)
 *   --limit=N            default: 200
 */

import "../env";
import { PsnBrowserClient } from "../../lib/psn/browser-client";
import { parseProductFromWCA } from "../../lib/psn/parser";
import {
  listProductsNeedingEnrichment,
  listProductsNeedingAiEnrichment,
  upsertProductDetail,
  upsertAiDescription,
} from "../../lib/psn/db";
import type { PsnRegion } from "../../lib/psn/types";

// ─── CLI args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const arg = (name: string) => {
  const eq = args.find((a) => a.startsWith(`--${name}=`));
  if (eq) return eq.split("=")[1];
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : undefined;
};

const phase  = (arg("phase")  ?? "all") as "psn" | "ai" | "all";
const regionArg = arg("region") ?? "ALL";
const limit  = Number(arg("limit") ?? "200");

const REGIONS: PsnRegion[] = regionArg === "ALL" ? ["TR"] : [regionArg as PsnRegion];


const CATEGORY_URL_FOR_SESSION: Record<PsnRegion, string> = {
  TR: "https://store.playstation.com/en-tr/category/3f772501-f6f8-49b7-abac-874a88ca4897/1",
  UA: "https://store.playstation.com/ru-ua/category/44d8bb20-653e-431e-8ad9-4f981f71cf23/1",
};
const LOCALE: Record<PsnRegion, string> = { TR: "en-tr", UA: "ru-ua" };

function productUrl(region: PsnRegion, id: string) {
  return `https://store.playstation.com/${LOCALE[region]}/product/${id}`;
}
function ruProductUrl(id: string) {
  return `https://store.playstation.com/ru-ua/product/${id}`;
}

// ─── Pass 1: PSN browser scraping ─────────────────────────────────────────────

if (phase === "psn" || phase === "all") {
  for (const region of REGIONS) {
    console.log(`\n${"═".repeat(60)}`);
    console.log(`[PSN] Enriching ${region} products…`);

    const products = await listProductsNeedingEnrichment(region, limit);
    console.log(`  ${products.length} products need PSN enrichment`);
    if (products.length === 0) continue;

    const browser = new PsnBrowserClient();
    await browser.launch();
    await browser.initSession(CATEGORY_URL_FOR_SESSION[region]);
    console.log("  Browser session established (Akamai OK)");

    let saved = 0, failed = 0;

    for (const { psnProductId } of products) {
      process.stdout.write(`  ${psnProductId.slice(0, 40)} … `);
      try {
        const wca = await browser.fetchProductDetail(productUrl(region, psnProductId));

        let ruWca = null;
        try {
          ruWca = await browser.fetchProductDetail(ruProductUrl(psnProductId));
        } catch { /* no ru-ua equivalent */ }

        const detail = parseProductFromWCA(wca, ruWca);
        await upsertProductDetail(region, psnProductId, detail);

        const hasRu = !!detail.longDescriptionRuText;
        const genre  = detail.genres[0] ?? "—";
        const rating = detail.rating != null ? detail.rating.toFixed(2) : "—";
        console.log(`✓  ${genre} | ★${rating} | RU=${hasRu ? "✓" : "✗"}`);
        saved++;
      } catch (err) {
        console.log(`✗  ${(err as Error).message.slice(0, 80)}`);
        failed++;
      }
    }

    await browser.close();
    console.log(`\n[PSN] ${region} done: ${saved} enriched, ${failed} failed`);
  }
}

// ─── Pass 2: OpenAI translation + summary ────────────────────────────────────

if (phase === "ai" || phase === "all") {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.log("\n[AI] Skipped — OPENAI_API_KEY not set");
  } else {

  for (const region of REGIONS) {
    console.log(`\n${"═".repeat(60)}`);
    console.log(`[AI] Processing ${region} products…`);

    const products = await listProductsNeedingAiEnrichment(region, limit);
    console.log(`  ${products.length} products need AI enrichment`);
    if (products.length === 0) continue;

    let saved = 0, failed = 0;

    for (const { psnProductId, title, descriptionOriginalText, descriptionRuText } of products) {
      process.stdout.write(`  ${title.slice(0, 48).padEnd(48)} … `);

      try {
        const needsTranslation = !descriptionRuText;

        const systemPrompt =
          "You are a game catalog assistant for a PlayStation Store pricing site targeting Russian-speaking users. " +
          "Respond with valid JSON only, no markdown fences.";

        const userPrompt = needsTranslation
          ? `Game title: ${title}\n\nEnglish description:\n${descriptionOriginalText}\n\n` +
            `Return JSON: { "translation": "full Russian translation", "summary": "1-2 sentence Russian summary for a buyer" }`
          : `Game title: ${title}\n\nRussian description:\n${descriptionRuText}\n\n` +
            `Return JSON: { "summary": "1-2 sentence Russian summary for a buyer" }`;

        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user",   content: userPrompt },
            ],
            max_tokens: needsTranslation ? 2000 : 300,
            temperature: 0.3,
          }),
        });

        if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);

        const json = (await res.json()) as {
          choices: Array<{ message: { content: string } }>;
        };
        const raw = json.choices[0]?.message?.content ?? "{}";
        const parsed = JSON.parse(raw) as { translation?: string; summary?: string };

        if (!parsed.summary) throw new Error("GPT returned no summary");

        await upsertAiDescription(region, psnProductId, {
          translationRu: parsed.translation ?? null,
          summaryRu: parsed.summary,
        });

        const tag = needsTranslation ? "translated+summary" : "summary";
        console.log(`✓  ${tag}`);
        saved++;
      } catch (err) {
        console.log(`✗  ${(err as Error).message.slice(0, 80)}`);
        failed++;
      }
    }

    console.log(`\n[AI] ${region} done: ${saved} enriched, ${failed} failed`);
  }
  }
}

console.log("\nAll done.");
