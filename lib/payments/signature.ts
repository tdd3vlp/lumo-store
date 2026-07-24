import { createHash, timingSafeEqual } from "node:crypto";

// Pure PayPalych signature helpers, kept free of "server-only" and of the API
// token env read so they are unit-testable. The caller supplies the token.
//
// SignatureValue = strtoupper(md5(OutSum . ":" . InvId . ":" . apiToken))
// Uses the exact string values received from the gateway — never reformat
// `outSum`, since the gateway signs the string it sent (e.g. "18.54").

export function paypalychSignature(
  outSum: string,
  invId: string,
  apiToken: string,
): string {
  return createHash("md5")
    .update(`${outSum}:${invId}:${apiToken}`)
    .digest("hex")
    .toUpperCase();
}

/** Case-insensitive, length-checked, timing-safe comparison of two signatures. */
export function signaturesMatch(received: string, expected: string): boolean {
  const got = (received ?? "").toUpperCase();
  const want = expected.toUpperCase();
  if (got.length !== want.length) return false;
  return timingSafeEqual(Buffer.from(got), Buffer.from(want));
}
