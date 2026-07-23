import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  type LoyaltyRates,
  bpsForClass,
  discountedUnitMinor,
  effectiveBps,
} from "../lib/account/loyalty-discount";

const GOLD: LoyaltyRates = { tierCode: "gold", cardBps: 500, topupBps: 300 };

describe("loyalty discount rates", () => {
  it("picks the rate for the item's class", () => {
    assert.equal(bpsForClass(GOLD, "card"), 500);
    assert.equal(bpsForClass(GOLD, "topup"), 300);
  });
});

describe("discountedUnitMinor", () => {
  it("leaves a zero-rate line untouched", () => {
    assert.equal(discountedUnitMinor(100000, 0), 100000);
  });

  it("applies 2% and 5% off, rounded to whole minor units", () => {
    // 595 ₽ (59500) at 2% → 583.1 → 58310
    assert.equal(discountedUnitMinor(59500, 200), 58310);
    // 1000 ₽ (100000) at 5% → 95000
    assert.equal(discountedUnitMinor(100000, 500), 95000);
    // 3% on a top-up: 500 ₽ (50000) → 48500
    assert.equal(discountedUnitMinor(50000, 300), 48500);
  });

  it("rounds half to the nearest minor unit", () => {
    // 333 (kopecks) at 5% → 316.35 → 316
    assert.equal(discountedUnitMinor(333, 500), 316);
  });

  it("clamps a full discount to free", () => {
    assert.equal(discountedUnitMinor(12345, 10000), 0);
  });

  it("keeps price × quantity exact for provider line items", () => {
    const unit = discountedUnitMinor(59500, 500); // 56525
    const qty = 3;
    // The order total is defined as unit × qty, so line items reconcile exactly.
    assert.equal(unit * qty, 169575);
  });
});

describe("effectiveBps", () => {
  it("reports the blended discount actually applied", () => {
    // subtotal 100000, discount 5000 → 500 bps
    assert.equal(effectiveBps(100000, 5000), 500);
  });

  it("is zero when nothing was discounted", () => {
    assert.equal(effectiveBps(100000, 0), 0);
    assert.equal(effectiveBps(0, 0), 0);
  });
});
