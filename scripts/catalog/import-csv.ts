import "../env";
import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { parse } from "csv-parse/sync";
import iconv from "iconv-lite";
import { createDatabaseClient } from "../../lib/database";
import { normalizeProductTitle } from "../../lib/catalog/normalize";

type CsvRow = Record<string, string>;

const HEADER = {
  image: "Изображения",
  title: "Название",
  psnId: "Артикул",
  price: "Цена",
  currency: "Валюта",
  available: "Наличие",
  category: "Категория",
  url: "URL",
  description: "Описание",
  platform: "Platform",
  release: "Release",
  publisher: "Publisher",
  genres: "Genres",
  voice: "Voice",
  screenLanguages: "Screen Languages",
  oldPrice: "Старая цена",
  ps5Voice: "PS5 Voice",
  ps5ScreenLanguages: "PS5 Screen Languages",
  ps4Voice: "PS4 Voice",
  ps4ScreenLanguages: "PS4 Screen Languages",
} as const;

function decodeCsv(buffer: Buffer) {
  const utf8 = buffer.toString("utf8");
  if (!utf8.includes("\uFFFD")) return utf8.replace(/^\uFEFF/, "");
  return iconv.decode(buffer, "windows-1251").replace(/^\uFEFF/, "");
}

async function collectCsvFiles(inputs: string[]) {
  const files: string[] = [];

  for (const input of inputs) {
    const absolute = path.resolve(input);
    const info = await stat(absolute);

    if (info.isFile() && absolute.toLowerCase().endsWith(".csv")) {
      files.push(absolute);
      continue;
    }

    if (info.isDirectory()) {
      const entries = await readdir(absolute, {
        recursive: true,
        withFileTypes: true,
      });
      for (const entry of entries) {
        if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".csv")) {
          continue;
        }
        files.push(path.join(entry.parentPath, entry.name));
      }
    }
  }

  return Array.from(new Set(files)).sort();
}

function parseMoney(value?: string) {
  if (!value) return null;
  const normalized = value.replace(/[^\d.,-]/g, "").replace(",", ".");
  const amount = Number(normalized);
  return Number.isFinite(amount) ? Math.round(amount * 100) : null;
}

function parseDate(value?: string) {
  if (!value) return null;
  const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function hasLanguage(values: Array<string | undefined>, language: string) {
  return values.some((value) =>
    value
      ?.split(",")
      .map((item) => item.trim().toLowerCase())
      .includes(language.toLowerCase()),
  );
}

function collectionFromFile(file: string, row: CsvRow) {
  return (
    row[HEADER.category]?.trim() ||
    path.basename(file, path.extname(file)).trim()
  );
}

const inputs = process.argv.slice(2);
if (inputs.length === 0) {
  throw new Error(
    "Usage: npm run catalog:import -- data/file.csv data/import-directory",
  );
}

const files = await collectCsvFiles(inputs);
if (files.length === 0) throw new Error("No CSV files found");

const sql = createDatabaseClient(1);

for (const file of files) {
  const buffer = await readFile(file);
  const checksum = createHash("sha256").update(buffer).digest("hex");
  const [alreadyImported] = await sql`
    SELECT id FROM catalog_imports WHERE checksum_sha256 = ${checksum}
  `;

  if (alreadyImported) {
    console.log(`Skipped unchanged file: ${file}`);
    continue;
  }

  const rows = parse(decodeCsv(buffer), {
    columns: true,
    delimiter: ";",
    bom: true,
    relax_column_count: true,
    relax_quotes: true,
    skip_empty_lines: true,
  }) as CsvRow[];

  let importedRows = 0;
  let skippedRows = 0;

  await sql.begin(async (transaction) => {
    const sourceCollection =
      rows[0] ? collectionFromFile(file, rows[0]) : path.basename(file);
    const [catalogImport] = await transaction`
      INSERT INTO catalog_imports (
        source_file,
        source_collection,
        checksum_sha256
      )
      VALUES (${path.basename(file)}, ${sourceCollection}, ${checksum})
      RETURNING id
    `;

    for (const row of rows) {
      const psnId = row[HEADER.psnId]?.trim();
      const title = row[HEADER.title]?.trim();

      if (!psnId || !title) {
        skippedRows += 1;
        continue;
      }

      const voiceFields = [
        row[HEADER.voice],
        row[HEADER.ps5Voice],
        row[HEADER.ps4Voice],
      ];
      const subtitleFields = [
        row[HEADER.screenLanguages],
        row[HEADER.ps5ScreenLanguages],
        row[HEADER.ps4ScreenLanguages],
      ];

      const normalizedTitle = normalizeProductTitle(title);
      const [product] = await transaction`
        INSERT INTO catalog_products (
          indian_psn_id,
          title,
          normalized_title,
          description_original,
          image_url,
          ps_store_url_in,
          platform,
          release_date,
          publisher,
          genres,
          russian_voice,
          russian_subtitles,
          english_voice,
          english_subtitles
        )
        VALUES (
          ${psnId},
          ${title},
          ${normalizedTitle},
          ${row[HEADER.description] || null},
          ${row[HEADER.image] || null},
          ${row[HEADER.url] || null},
          ${row[HEADER.platform] || null},
          ${parseDate(row[HEADER.release])},
          ${row[HEADER.publisher] || null},
          ${row[HEADER.genres] || null},
          ${hasLanguage(voiceFields, "Russian")},
          ${hasLanguage(subtitleFields, "Russian")},
          ${hasLanguage(voiceFields, "English")},
          ${hasLanguage(subtitleFields, "English")}
        )
        ON CONFLICT (indian_psn_id) DO UPDATE SET
          title = EXCLUDED.title,
          normalized_title = EXCLUDED.normalized_title,
          description_original = EXCLUDED.description_original,
          image_url = EXCLUDED.image_url,
          ps_store_url_in = EXCLUDED.ps_store_url_in,
          platform = EXCLUDED.platform,
          release_date = EXCLUDED.release_date,
          publisher = EXCLUDED.publisher,
          genres = EXCLUDED.genres,
          russian_voice = EXCLUDED.russian_voice,
          russian_subtitles = EXCLUDED.russian_subtitles,
          english_voice = EXCLUDED.english_voice,
          english_subtitles = EXCLUDED.english_subtitles,
          updated_at = now()
        RETURNING id
      `;

      const collection = collectionFromFile(file, row);
      await transaction`
        INSERT INTO catalog_offers (
          import_id,
          product_id,
          collection,
          price_minor,
          original_price_minor,
          currency,
          available,
          raw_row
        )
        VALUES (
          ${catalogImport.id},
          ${product.id},
          ${collection},
          ${parseMoney(row[HEADER.price])},
          ${parseMoney(row[HEADER.oldPrice])},
          ${(row[HEADER.currency] || "INR").slice(0, 3)},
          ${!/^нет|no$/i.test(row[HEADER.available] || "")},
          ${sql.json(row)}
        )
      `;

      importedRows += 1;
    }

    await transaction`
      UPDATE catalog_imports
      SET imported_rows = ${importedRows}, skipped_rows = ${skippedRows}
      WHERE id = ${catalogImport.id}
    `;
  });

  console.log(
    `Imported ${path.basename(file)}: ${importedRows} rows, ${skippedRows} skipped`,
  );
}

await sql.end();
