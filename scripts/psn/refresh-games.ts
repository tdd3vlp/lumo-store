/**
 * Periodic pre-order game refresh — run by the systemd timer
 * (deploy/lumo-games-refresh.timer). Re-fetches the N stalest games' prices,
 * data and AI text from PSN, one at a time with a pause between, so the request
 * rate stays low as the catalog grows (bursts risk an Akamai block). Each
 * refreshed game gets refreshed_at=now() and drops to the back of the queue, so
 * successive runs cycle through the whole catalog.
 *
 *   node_modules/.bin/tsx scripts/psn/refresh-games.ts [limit]
 */
import "../env";
import postgres from "postgres";
import { enrichWithAi } from "../../lib/games/ai";
import { fetchPsnGame } from "../../lib/games/psn-fetch";

const LIMIT = Number(process.argv[2] ?? process.env.GAMES_REFRESH_LIMIT ?? 3);
const DELAY_MS = 2000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is missing");
const sql = postgres(databaseUrl, { max: 1, prepare: false });

const rows = await sql<Array<{ slug: string; source_url: string }>>`
  SELECT slug, source_url FROM preorder_games
  WHERE source_url IS NOT NULL
  ORDER BY refreshed_at ASC
  LIMIT ${LIMIT}
`;

let updated = 0;
for (let i = 0; i < rows.length; i++) {
  if (i > 0) await sleep(DELAY_MS);
  const { slug, source_url } = rows[i];
  try {
    const g = await enrichWithAi(await fetchPsnGame(source_url));
    await sql`
      UPDATE preorder_games SET
        title = ${g.title}, platform = ${g.platform}, release_date = ${g.releaseDate},
        cover_url = ${g.cover}, editions = ${sql.json(g.editions)},
        summary = ${g.summary ?? ""}, refreshed_at = now()
      WHERE slug = ${slug}
    `;
    console.log(`refreshed ${slug}`);
    updated += 1;
  } catch (err) {
    console.error(`failed ${slug}:`, (err as Error).message);
  }
}

console.log(`done — refreshed ${updated}/${rows.length}`);
await sql.end();
