import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  clientSignalsFrom,
  requestContextFrom,
} from "../lib/audit/request-context";
import { isClientReportableEvent } from "../lib/audit/types";

describe("clientSignalsFrom", () => {
  it("coerces and bounds untrusted fields", () => {
    const s = clientSignalsFrom({
      timezone: "  Europe/Moscow  ",
      screenResolution: "1920x1080",
      platform: "Win32",
      deviceMemory: "8",
      hardwareConcurrency: "12",
      browserFingerprint: "abc",
      sessionId: "sess-1",
      unexpected: "ignored",
    });
    assert.equal(s.timezone, "Europe/Moscow");
    assert.equal(s.hardwareConcurrency, 12);
    assert.equal(s.sessionId, "sess-1");
  });

  it("defaults everything to null for garbage input", () => {
    const s = clientSignalsFrom(null);
    assert.deepEqual(s, {
      timezone: null,
      screenResolution: null,
      platform: null,
      deviceMemory: null,
      hardwareConcurrency: null,
      browserFingerprint: null,
      sessionId: null,
    });
  });

  it("drops empty strings and non-finite numbers", () => {
    const s = clientSignalsFrom({
      timezone: "   ",
      hardwareConcurrency: "not-a-number",
    });
    assert.equal(s.timezone, null);
    assert.equal(s.hardwareConcurrency, null);
  });
});

describe("requestContextFrom", () => {
  it("reads proxy + browser headers, mapping unknown IP to null", () => {
    const req = new Request("https://x.test/api", {
      headers: {
        "x-forwarded-for": "203.0.113.7, 10.0.0.1",
        "user-agent": "UA/1.0",
        referer: "https://x.test/profile",
        "accept-language": "ru-RU",
      },
    });
    const ctx = requestContextFrom(req);
    assert.equal(ctx.ip, "203.0.113.7");
    assert.equal(ctx.userAgent, "UA/1.0");
    assert.equal(ctx.referer, "https://x.test/profile");
    assert.equal(ctx.acceptLanguage, "ru-RU");

    const bare = requestContextFrom(new Request("https://x.test/api"));
    assert.equal(bare.ip, null);
  });
});

describe("isClientReportableEvent", () => {
  it("accepts only browser-reportable events", () => {
    assert.equal(isClientReportableEvent("CODE_COPIED"), true);
    assert.equal(isClientReportableEvent("PAGE_CLOSED"), true);
    // Authoritative events may not be self-reported.
    assert.equal(isClientReportableEvent("CODE_REVEALED"), false);
    assert.equal(isClientReportableEvent("ORDER_PAID"), false);
    assert.equal(isClientReportableEvent("nope"), false);
  });
});
