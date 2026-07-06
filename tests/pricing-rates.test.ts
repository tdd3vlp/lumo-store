import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateRubMinor,
  DEFAULT_REGION_PRICING_RATES,
  formatPriceAsRubles,
  formatRubRate,
  getRegionRate,
  parseRubRateToMinorPerUnit,
} from "../lib/pricing/rates";

describe("regional pricing rates", () => {
  it("parses dotted ruble rates into minor units", () => {
    assert.equal(parseRubRateToMinorPerUnit("1.25"), 125);
  });

  it("parses comma-separated ruble rates into minor units", () => {
    assert.equal(parseRubRateToMinorPerUnit("2,25"), 225);
  });

  it("parses whole-number rates", () => {
    assert.equal(parseRubRateToMinorPerUnit("3"), 300);
  });

  it("avoids float rounding artifacts", () => {
    assert.equal(parseRubRateToMinorPerUnit("0.07"), 7);
  });

  it("rejects invalid, zero and negative values", () => {
    assert.throws(() => parseRubRateToMinorPerUnit("abc"));
    assert.throws(() => parseRubRateToMinorPerUnit(""));
    assert.throws(() => parseRubRateToMinorPerUnit("0"));
    assert.throws(() => parseRubRateToMinorPerUnit("-1.25"));
    assert.throws(() => parseRubRateToMinorPerUnit("1.234"));
  });

  it("calculates ruble totals in minor units for TRY", () => {
    assert.equal(calculateRubMinor(1000, 225), 225000);
  });

  it("rejects invalid arguments to calculateRubMinor", () => {
    assert.throws(() => calculateRubMinor(1000, 0));
    assert.throws(() => calculateRubMinor(1000, -1));
    assert.throws(() => calculateRubMinor(-1, 225));
    assert.throws(() => calculateRubMinor(1.5, 225));
  });

  it("formats minor units back into a rate string", () => {
    assert.equal(formatRubRate(125), "1.25");
    assert.equal(formatRubRate(225), "2.25");
    assert.equal(formatRubRate(300), "3");
  });
});

describe("getRegionRate", () => {
  it("returns kopecks-per-unit derived from cardCoefficientBps", () => {
    // TR: cardCoefficientBps=25000 → 250 kopecks/unit = 2.5 ₽/₺
    assert.equal(getRegionRate("TR"), 250);
  });

  it("returns the rate from a custom rates array", () => {
    assert.equal(getRegionRate("TR", [{ region: "TR", cardCoefficientBps: 25000 }]), 250);
  });

  it("falls back to DEFAULT_REGION_PRICING_RATES when region is missing from provided array", () => {
    assert.equal(getRegionRate("TR", [{ region: "UA", cardCoefficientBps: 20000 }]), 250);
  });

  it("falls back to 100 for an unknown region", () => {
    assert.equal(getRegionRate("XX", []), 100);
  });
});

describe("formatPriceAsRubles", () => {
  it("converts 1000 TRY at rate 225 to 2 250 ₽", () => {
    assert.match(formatPriceAsRubles(1000, 225), /2\s?250\s?₽/);
  });

  it("uses the correct rate from context (rate 250 gives 2 500 ₽)", () => {
    assert.match(formatPriceAsRubles(1000, 250), /2\s?500\s?₽/);
  });

  it("rounds non-integer amounts before converting", () => {
    assert.match(formatPriceAsRubles(999.7, 225), /2\s?250\s?₽/);
  });

  it("falls back via DEFAULT_REGION_PRICING_RATES: cart total of 2 TRY items at coefficient 2.5", () => {
    const rate = getRegionRate("TR", DEFAULT_REGION_PRICING_RATES);
    const total = 1000 + 2000;
    // rate = 250 kopecks/unit → 3000 × 250 / 100 = 7500 ₽
    assert.match(formatPriceAsRubles(total, rate), /7\s?500\s?₽/);
  });
});
