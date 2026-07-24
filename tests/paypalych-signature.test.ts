import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  paypalychSignature,
  signaturesMatch,
} from "../lib/payments/signature";

// SignatureValue = strtoupper(md5(OutSum . ":" . InvId . ":" . apiToken))
describe("paypalych signature", () => {
  const token = "123|q4uNcWNKMNZoSFSY1XTxp36nsM0kUMSu0otSA95";

  it("is an uppercase 32-char md5 hex of OutSum:InvId:token", () => {
    const sig = paypalychSignature("18.54", "Order 123", token);
    assert.match(sig, /^[0-9A-F]{32}$/);
    assert.equal(sig, sig.toUpperCase());
  });

  it("changes when any signed field changes", () => {
    const base = paypalychSignature("18.54", "Order 123", token);
    assert.notEqual(base, paypalychSignature("18.55", "Order 123", token));
    assert.notEqual(base, paypalychSignature("18.54", "Order 124", token));
    assert.notEqual(base, paypalychSignature("18.54", "Order 123", `${token}x`));
  });

  it("does not reformat OutSum (trailing zeros matter)", () => {
    assert.notEqual(
      paypalychSignature("18.5", "Order 123", token),
      paypalychSignature("18.50", "Order 123", token),
    );
  });

  it("accepts a matching signature case-insensitively", () => {
    const sig = paypalychSignature("380.55", "payment-1", token);
    assert.ok(signaturesMatch(sig, sig));
    assert.ok(signaturesMatch(sig.toLowerCase(), sig));
  });

  it("rejects a tampered or wrong-length signature", () => {
    const sig = paypalychSignature("380.55", "payment-1", token);
    const tampered = `${sig.slice(0, -1)}${sig.at(-1) === "0" ? "1" : "0"}`;
    assert.equal(signaturesMatch(tampered, sig), false);
    assert.equal(signaturesMatch("", sig), false);
    assert.equal(signaturesMatch(`${sig}00`, sig), false);
  });
});
