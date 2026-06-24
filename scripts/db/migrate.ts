import "../env";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is missing");
}

const sql = postgres(databaseUrl, { max: 1, prepare: false });
const migrationsDir = path.resolve("db/migrations");
const files = (await readdir(migrationsDir))
  .filter((file) => file.endsWith(".sql"))
  .sort();

await sql.unsafe(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )
`);

for (const file of files) {
  const migration = await readFile(path.join(migrationsDir, file), "utf8");
  const legacyVersion = `${file}:${createHash("sha256").update(migration).digest("hex")}`;
  const [existing] = await sql`
    SELECT version
    FROM schema_migrations
    WHERE version = ${file}
      OR version = ${legacyVersion}
      OR version LIKE ${`${file}:%`}
    LIMIT 1
  `;

  if (existing) continue;

  await sql.begin(async (transaction) => {
    await transaction.unsafe(migration);
    await transaction`
      INSERT INTO schema_migrations (version) VALUES (${file})
    `;
  });

  console.log(`Applied ${file}`);
}

await sql.end();
