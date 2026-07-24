import "server-only";
import { sql } from "@/lib/db";
import { encryptPsAccount, type PsAccountFields } from "./crypto";

/** Stores one account's credentials (encrypted) as available inventory. */
export async function addPsAccount(region: string, fields: PsAccountFields): Promise<void> {
  const { ciphertext, iv, authTag } = encryptPsAccount(fields);
  await sql`
    INSERT INTO ps_accounts (region, data_ciphertext, data_iv, data_auth_tag)
    VALUES (${region}, ${ciphertext}, ${iv}, ${authTag})
  `;
}

/** { region → number of available accounts }. Empty on any DB error. */
export async function availablePsAccountCounts(): Promise<Record<string, number>> {
  try {
    const rows = await sql`
      SELECT region, COUNT(*)::int AS n
      FROM ps_accounts
      WHERE status = 'available'
      GROUP BY region
    `;
    const out: Record<string, number> = {};
    for (const r of rows) out[String(r.region)] = Number(r.n);
    return out;
  } catch {
    return {};
  }
}
