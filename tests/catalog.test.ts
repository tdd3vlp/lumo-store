import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  containsCyrillic,
  normalizeProductTitle,
  titleSimilarity,
} from "../lib/catalog/normalize";
import { inferEditionName } from "../lib/catalog/editions";

describe("catalog normalization", () => {
  it("removes platform and edition noise from product titles", () => {
    assert.equal(
      normalizeProductTitle("FINAL FANTASY VII REBIRTH™ Digital Deluxe Edition PS5"),
      "final fantasy vii rebirth",
    );
  });

  it("calculates token similarity for related titles", () => {
    assert.equal(
      titleSimilarity("Cuphead & The Delicious Last Course", "Cuphead Deluxe Bundle"),
      0.2,
    );
  });

  it("detects cyrillic text", () => {
    assert.equal(containsCyrillic("Русские субтитры"), true);
    assert.equal(containsCyrillic("English subtitles"), false);
  });
});

describe("catalog editions", () => {
  it("recognizes known edition names", () => {
    assert.equal(
      inferEditionName("Mortal Kombat 1 Premium Edition"),
      "Premium Edition",
    );
    assert.equal(
      inferEditionName("Call of Duty: Black Ops 6 Cross-Gen Bundle"),
      "Cross-Gen Bundle",
    );
  });

  it("falls back to standard edition", () => {
    assert.equal(inferEditionName("Hollow Knight: Silksong"), "Standard Edition");
  });
});
