import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildCategoryPageUrl, buildProductUrl } from "../lib/psn/urls";

describe("buildCategoryPageUrl", () => {
  const base = "https://store.playstation.com/en-tr/category/abc123";

  it("appends page when path has no trailing number", () => {
    assert.equal(buildCategoryPageUrl(base, 2), `${base}/2`);
  });

  it("replaces an existing trailing page number", () => {
    assert.equal(buildCategoryPageUrl(`${base}/1`, 3), `${base}/3`);
    assert.equal(buildCategoryPageUrl(`${base}/7`, 1), `${base}/1`);
  });

  it("strips query string and does not corrupt the path", () => {
    assert.equal(
      buildCategoryPageUrl(`${base}/1?foo=bar&baz=1`, 2),
      `${base}/2`,
    );
  });

  it("strips a hash fragment", () => {
    assert.equal(buildCategoryPageUrl(`${base}/1#section`, 4), `${base}/4`);
  });

  it("handles query on a path without a trailing number", () => {
    assert.equal(buildCategoryPageUrl(`${base}?x=1`, 2), `${base}/2`);
  });

  it("handles a trailing slash", () => {
    assert.equal(buildCategoryPageUrl(`${base}/`, 2), `${base}/2`);
    assert.equal(buildCategoryPageUrl(`${base}/1/`, 5), `${base}/5`);
  });

  it("keeps the host and locale intact", () => {
    const url = new URL(buildCategoryPageUrl(`${base}/1`, 9));
    assert.equal(url.hostname, "store.playstation.com");
    assert.ok(url.pathname.startsWith("/en-tr/category/"));
    assert.equal(url.search, "");
    assert.equal(url.hash, "");
  });
});

describe("buildProductUrl", () => {
  it("builds locale-correct product URLs per region", () => {
    assert.equal(
      buildProductUrl("TR", "PPSA07215_00100000"),
      "https://store.playstation.com/en-tr/product/PPSA07215_00100000",
    );
    assert.equal(
      buildProductUrl("UA", "PPSA07215_00100000"),
      "https://store.playstation.com/ru-ua/product/PPSA07215_00100000",
    );
  });
});
