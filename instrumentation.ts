// Next.js instrumentation hook — runs once at server startup. Fail fast on
// misconfiguration so a bad deploy is caught immediately, not at 3am on the
// first payment/reveal.
export async function register() {
  // Node-only checks (Buffer/crypto); skip on the edge runtime.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Validate the audit hash-chain key up front: a missing/short key would
    // otherwise only surface when the first reveal or ORDER_PAID tries to write
    // the journal. Throwing here aborts startup.
    const { auditChainKey } = await import("@/lib/audit/hash-chain");
    auditChainKey();
  }
}
