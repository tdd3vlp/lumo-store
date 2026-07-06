import "../env";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { createDatabaseClient } from "../../lib/database";
import { encryptGiftCardCode } from "../../lib/gift-cards/crypto";

type InventoryRow = {
  region?: string;
  currency?: string;
  denomination?: string;
  code?: string;
  supplier_reference?: string;
  cost?: string;
};

const file = process.argv[2];
if (!file) {
  throw new Error(
    "Usage: npm run gift-cards:import -- inventory.csv\n" +
      "Columns: region,currency,denomination,code,supplier_reference,cost",
  );
}

const rows = parse(await readFile(path.resolve(file), "utf8"), {
  columns: true,
  skip_empty_lines: true,
  trim: true,
}) as InventoryRow[];

const sql = createDatabaseClient(1);
let imported = 0;
let skipped = 0;

for (const row of rows) {
  const amountMajor = Number(row.denomination);
  const code = row.code?.trim();
  const region = row.region?.trim() || "TR";
  const currency = (row.currency?.trim() || "TRY").slice(0, 3);

  if (!code || !Number.isFinite(amountMajor) || amountMajor <= 0) {
    skipped += 1;
    continue;
  }

  const encrypted = encryptGiftCardCode(code);
  const [denomination] = await sql`
    INSERT INTO gift_card_denominations (region, currency, amount_minor)
    VALUES (${region}, ${currency}, ${Math.round(amountMajor * 100)})
    ON CONFLICT (region, currency, amount_minor) DO UPDATE SET active = true
    RETURNING id
  `;

  const result = await sql`
    INSERT INTO gift_card_inventory (
      denomination_id,
      code_ciphertext,
      code_iv,
      code_auth_tag,
      code_fingerprint,
      supplier_reference,
      cost_minor
    )
    VALUES (
      ${denomination.id},
      ${encrypted.ciphertext},
      ${encrypted.iv},
      ${encrypted.authTag},
      ${encrypted.fingerprint},
      ${row.supplier_reference || null},
      ${row.cost ? Math.round(Number(row.cost) * 100) : null}
    )
    ON CONFLICT (code_fingerprint) DO NOTHING
    RETURNING id
  `;

  if (result.length > 0) imported += 1;
  else skipped += 1;
}

console.log(`Imported ${imported} gift cards, skipped ${skipped}.`);
await sql.end();
