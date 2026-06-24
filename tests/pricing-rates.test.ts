import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateRubMinor,
  formatRubRate,
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

  it("calculates ruble totals in minor units for INR", () => {
    assert.equal(calculateRubMinor(1000, 125), 125000);
  });

  it("calculates ruble totals in minor units for TRY", () => {
    assert.equal(calculateRubMinor(1000, 225), 225000);
  });

  it("rejects invalid arguments to calculateRubMinor", () => {
    assert.throws(() => calculateRubMinor(1000, 0));
    assert.throws(() => calculateRubMinor(1000, -1));
    assert.throws(() => calculateRubMinor(-1, 125));
    assert.throws(() => calculateRubMinor(1.5, 125));
  });

  it("formats minor units back into a rate string", () => {
    assert.equal(formatRubRate(125), "1.25");
    assert.equal(formatRubRate(225), "2.25");
    assert.equal(formatRubRate(300), "3");
  });
});
