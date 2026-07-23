import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  type ChainCore,
  CHAIN_GENESIS,
  computeRowHash,
  verifyChain,
} from "../lib/audit/hash-chain";

const KEY = Buffer.alloc(32, 9);
const OTHER_KEY = Buffer.alloc(32, 5);

function core(overrides: Partial<ChainCore> = {}): ChainCore {
  return {
    eventType: "CODE_REVEALED",
    eventKey: "k",
    occurredAt: "2026-07-21T18:32:12.000Z",
    orderId: "o1",
    orderItemId: "i1",
    customerId: "c1",
    productId: "p1",
    codeId: "code1",
    warningVersion: 1,
    ip: "1.2.3.4",
    userAgent: "UA",
    referer: null,
    acceptLanguage: "ru",
    timezone: "Europe/Moscow",
    screenResolution: "1920x1080",
    platform: "Win32",
    deviceMemory: "8",
    hardwareConcurrency: 8,
    browserFingerprint: "fp",
    sessionId: "s1",
    payload: null,
    ...overrides,
  };
}

/** Build a valid chain of the given cores. */
function chain(cores: ChainCore[]) {
  let prev: string | null = null;
  return cores.map((c, seq) => {
    const rowHash = computeRowHash(KEY, prev, c);
    const row = { seq, prevHash: prev, rowHash, core: c };
    prev = rowHash;
    return row;
  });
}

describe("audit hash-chain", () => {
  it("is deterministic and salted by the previous hash", () => {
    const c = core();
    assert.equal(computeRowHash(KEY, null, c), computeRowHash(KEY, CHAIN_GENESIS, c));
    assert.notEqual(computeRowHash(KEY, null, c), computeRowHash(KEY, "deadbeef", c));
  });

  it("depends on the HMAC key (a forger without the key can't recompute it)", () => {
    const c = core();
    assert.notEqual(
      computeRowHash(KEY, null, c),
      computeRowHash(OTHER_KEY, null, c),
    );
  });

  it("is independent of payload key order", () => {
    const a = core({ payload: { a: 1, b: { x: 1, y: 2 } } });
    const b = core({ payload: { b: { y: 2, x: 1 }, a: 1 } });
    assert.equal(computeRowHash(KEY, null, a), computeRowHash(KEY, null, b));
  });

  it("verifies an intact chain", () => {
    const rows = chain([core({ eventKey: "1" }), core({ eventKey: "2" }), core({ eventKey: "3" })]);
    assert.deepEqual(verifyChain(KEY, rows), { ok: true, brokenSeq: null });
  });

  it("fails verification under the wrong key", () => {
    const rows = chain([core({ eventKey: "1" }), core({ eventKey: "2" })]);
    assert.equal(verifyChain(OTHER_KEY, rows).ok, false);
  });

  it("detects edited content (row_hash no longer matches)", () => {
    const rows = chain([core({ eventKey: "1" }), core({ eventKey: "2" })]);
    // Tamper with the stored content but leave the hash as-is.
    rows[1] = { ...rows[1], core: core({ eventKey: "2", ip: "9.9.9.9" }) };
    const result = verifyChain(KEY, rows);
    assert.equal(result.ok, false);
    assert.equal(result.brokenSeq, 1);
  });

  it("detects a removed middle row (broken linkage)", () => {
    const rows = chain([
      core({ eventKey: "1" }),
      core({ eventKey: "2" }),
      core({ eventKey: "3" }),
    ]);
    const withoutMiddle = [rows[0], rows[2]];
    const result = verifyChain(KEY, withoutMiddle);
    assert.equal(result.ok, false);
    assert.equal(result.brokenSeq, 2);
  });

  it("detects a swapped/forged hash", () => {
    const rows = chain([core({ eventKey: "1" }), core({ eventKey: "2" })]);
    rows[1] = { ...rows[1], rowHash: "0".repeat(64) };
    assert.equal(verifyChain(KEY, rows).ok, false);
  });

  it("detects head truncation with expectedAnchor (full scan)", () => {
    const rows = chain([
      core({ eventKey: "1" }),
      core({ eventKey: "2" }),
      core({ eventKey: "3" }),
    ]);
    // Attacker deletes the first K rows: the tail is internally consistent…
    const tail = rows.slice(1);
    assert.deepEqual(verifyChain(KEY, tail), { ok: true, brokenSeq: null });
    // …but a full scan anchored to genesis catches it (row no longer links to it).
    const anchored = verifyChain(KEY, tail, { expectedAnchor: CHAIN_GENESIS });
    assert.equal(anchored.ok, false);
    assert.equal(anchored.brokenSeq, tail[0].seq);
  });

  it("passes an intact full chain when anchored to genesis", () => {
    const rows = chain([core({ eventKey: "1" }), core({ eventKey: "2" })]);
    assert.deepEqual(verifyChain(KEY, rows, { expectedAnchor: CHAIN_GENESIS }), {
      ok: true,
      brokenSeq: null,
    });
  });
});
