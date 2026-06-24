import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  decryptGiftCardCode,
  encryptGiftCardCode,
} from "../lib/gift-cards/crypto";

const validKey = Buffer.alloc(32, 7).toString("base64");

describe("gift card code crypto", () => {
  it("encrypts and decrypts trimmed codes", () => {
    process.env.GIFT_CARD_ENCRYPTION_KEY = validKey;

    const encrypted = encryptGiftCardCode("  PSN-1234-5678  ");

    assert.notEqual(encrypted.ciphertext.toString("utf8"), "PSN-1234-5678");
    assert.equal(decryptGiftCardCode(encrypted), "PSN-1234-5678");
  });

  it("generates a stable fingerprint for equivalent trimmed codes", () => {
    process.env.GIFT_CARD_ENCRYPTION_KEY = validKey;

    const first = encryptGiftCardCode("PSN-0000");
    const second = encryptGiftCardCode("  PSN-0000  ");

    assert.equal(first.fingerprint, second.fingerprint);
    assert.notDeepEqual(first.iv, second.iv);
  });

  it("rejects missing or invalid encryption keys", () => {
    delete process.env.GIFT_CARD_ENCRYPTION_KEY;
    assert.throws(() => encryptGiftCardCode("PSN-FAIL"), /missing/);

    process.env.GIFT_CARD_ENCRYPTION_KEY = Buffer.alloc(12).toString("base64");
    assert.throws(() => encryptGiftCardCode("PSN-FAIL"), /exactly 32 bytes/);
  });
});
