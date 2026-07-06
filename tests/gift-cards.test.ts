import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { recommendGiftCards } from "../lib/gift-cards/recommendation";
import {
  formatRegionalAmount,
  formatRubles,
} from "../lib/gift-cards/regions";

describe("gift card recommendations", () => {
  const options = [
    { id: "in-1000", amount: 1000, salePriceMinor: 115000 },
    { id: "in-2000", amount: 2000, salePriceMinor: 230000 },
    { id: "in-5000", amount: 5000, salePriceMinor: 575000 },
  ];

  it("returns null when no balance is needed", () => {
    assert.equal(recommendGiftCards(0, options), null);
    assert.equal(recommendGiftCards(1200, []), null);
  });

  it("chooses the smallest sufficient balance", () => {
    const recommendation = recommendGiftCards(2600, options);

    assert.deepEqual(recommendation, {
      cards: [
        { id: "in-2000", amount: 2000, salePriceMinor: 230000, quantity: 1 },
        { id: "in-1000", amount: 1000, salePriceMinor: 115000, quantity: 1 },
      ],
      balance: 3000,
      remainder: 400,
      salePriceMinor: 345000,
    });
  });

  it("uses fewer cards when balances are equivalent", () => {
    const recommendation = recommendGiftCards(5000, options);

    assert.equal(recommendation?.balance, 5000);
    assert.deepEqual(recommendation?.cards, [
      { id: "in-5000", amount: 5000, salePriceMinor: 575000, quantity: 1 },
    ]);
  });

  it("keeps customer sale price unknown if any selected card has no price", () => {
    const recommendation = recommendGiftCards(2600, [
      { id: "in-1000", amount: 1000, salePriceMinor: 115000 },
      { id: "in-2000", amount: 2000, salePriceMinor: null },
    ]);

    assert.equal(recommendation?.balance, 3000);
    assert.equal(recommendation?.salePriceMinor, null);
  });
});

describe("regional formatting", () => {
  it("formats store amounts by region", () => {
    assert.equal(formatRegionalAmount("TR", 12000), "₺12.000");
  });

  it("formats ruble minor units and missing prices", () => {
    assert.equal(formatRubles(null), "Цена уточняется");
    assert.match(formatRubles(123400), /1\s?234\s?₽/);
  });
});
