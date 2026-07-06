import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseCategory, parseProduct, ParseError } from "../lib/psn/parser";

const FIXTURES = path.resolve("tests/fixtures/psn");

async function fixture(name: string) {
  return readFile(path.join(FIXTURES, name), "utf8");
}

describe("parseCategory", () => {
  it("handles tr-tr category with TRY currency", async () => {
    const html = await fixture("category-tr-tr.html");
    const products = parseCategory(html);

    assert.equal(products.length, 2);
    for (const p of products) {
      assert.equal(p.currencyCode, "TRY");
    }

    const spiderman = products.find(
      (p) => p.psnProductId === "PPSA07215_00100000",
    )!;
    assert.equal(spiderman.priceMinor, 107940);
    assert.equal(spiderman.originalPriceMinor, 179900);
  });

  it("throws ParseError when __NEXT_DATA__ is missing", () => {
    assert.throws(
      () => parseCategory("<html><body>no data</body></html>"),
      (err) => err instanceof ParseError,
    );
  });

  it("throws ParseError when apolloState is missing", () => {
    const html = `<script id="__NEXT_DATA__" type="application/json">{"props":{"pageProps":{}}}</script>`;
    assert.throws(
      () => parseCategory(html),
      (err) => err instanceof ParseError,
    );
  });
});

describe("parseProduct", () => {
  it("extracts Russian description from ru-ua product page", async () => {
    const html = await fixture("product-ru-ua.html");
    const product = parseProduct(html);

    assert.equal(product.psnProductId, "PPSA07215_00100000");
    assert.ok(product.shortDescription?.includes("Питера Паркера"));
    assert.ok(product.longDescriptionText?.includes("Паркера"));
    assert.ok(!product.longDescriptionText?.includes("<p>"));
    assert.ok(product.voiceLanguages.includes("RU"));
  });

  it("throws ParseError when no Product entry in apolloState", () => {
    const html = `<script id="__NEXT_DATA__" type="application/json">{"props":{"pageProps":{"apolloState":{"SearchProduct:x":{"__typename":"SearchProduct","id":"x"}}}}}</script>`;
    assert.throws(
      () => parseProduct(html),
      (err) => err instanceof ParseError,
    );
  });

  it("error lists the apolloState key prefixes to aid real-page debugging", () => {
    const html = `<script id="__NEXT_DATA__" type="application/json">{"props":{"pageProps":{"apolloState":{"SearchProduct:x":{"__typename":"SearchProduct","id":"x"},"batarangs:some-title":{"foo":1}}}}}</script>`;
    assert.throws(
      () => parseProduct(html),
      (err) => {
        assert.ok(err instanceof ParseError);
        assert.match(err.message, /SearchProduct/);
        assert.match(err.message, /batarangs/);
        return true;
      },
    );
  });
});
