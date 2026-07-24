import "server-only";
import { sql } from "@/lib/db";
import type { Game, GameEdition } from "./catalog";

type Row = {
  slug: string;
  title: string;
  platform: string;
  release_date: string;
  cover_url: string;
  editions: unknown;
  summary: string;
};

function toGame(row: Row): Game {
  return {
    slug: row.slug,
    title: row.title,
    platform: row.platform,
    releaseDate: row.release_date,
    cover: row.cover_url,
    editions: (Array.isArray(row.editions) ? row.editions : []) as GameEdition[],
    summary: row.summary || undefined,
  };
}

/**
 * Admin-managed pre-order games from the DB, oldest first (added order, so new
 * games land at the end of the catalog). Returns [] on any DB error so the
 * storefront falls back to the built-in GAMES and never blanks out.
 */
export async function listDbGames(): Promise<Game[]> {
  try {
    const rows = await sql<Row[]>`
      SELECT slug, title, platform, release_date, cover_url, editions, summary
      FROM preorder_games
      ORDER BY created_at ASC
    `;
    return rows.map(toGame);
  } catch {
    return [];
  }
}

/** Upsert a game by slug — re-importing the same game refreshes its prices. */
export async function saveGame(game: Game, sourceUrl: string): Promise<void> {
  await sql`
    INSERT INTO preorder_games (slug, title, platform, release_date, cover_url, source_url, editions, summary)
    VALUES (
      ${game.slug}, ${game.title}, ${game.platform}, ${game.releaseDate},
      ${game.cover}, ${sourceUrl}, ${sql.json(game.editions)}, ${game.summary ?? ""}
    )
    ON CONFLICT (slug) DO UPDATE SET
      title = EXCLUDED.title,
      platform = EXCLUDED.platform,
      release_date = EXCLUDED.release_date,
      cover_url = EXCLUDED.cover_url,
      source_url = EXCLUDED.source_url,
      editions = EXCLUDED.editions,
      summary = EXCLUDED.summary,
      refreshed_at = now()
  `;
}

export async function deleteGame(slug: string): Promise<void> {
  await sql`DELETE FROM preorder_games WHERE slug = ${slug}`;
}

/**
 * Import URLs for the `limit` stalest games (least-recently refreshed first), so
 * a refresh run touches only a small batch and keeps the PSN request rate low.
 */
export async function listStaleGameSources(
  limit: number,
): Promise<Array<{ slug: string; sourceUrl: string }>> {
  const rows = await sql<Array<{ slug: string; source_url: string | null }>>`
    SELECT slug, source_url FROM preorder_games
    WHERE source_url IS NOT NULL
    ORDER BY refreshed_at ASC
    LIMIT ${limit}
  `;
  return rows.map((r) => ({ slug: r.slug, sourceUrl: r.source_url as string }));
}

/** Count of games that can be refreshed (have a source URL). */
export async function countRefreshableGames(): Promise<number> {
  const [row] = await sql<Array<{ n: number }>>`
    SELECT COUNT(*)::int AS n FROM preorder_games WHERE source_url IS NOT NULL
  `;
  return Number(row?.n ?? 0);
}
