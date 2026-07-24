import "server-only";
import { enrichWithAi } from "./ai";
import { fetchPsnGame } from "./psn-fetch";
import { listStaleGameSources, saveGame } from "./store";

// Seconds between games so a refresh run makes a slow, steady trickle of PSN
// requests rather than a burst — bursts risk an Akamai block once the catalog
// is large. saveGame stamps refreshed_at=now(), so each refreshed game drops to
// the back of the stalest-first queue and the next run picks up different games.
const DELAY_MS = 1500;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Refresh the `limit` stalest games (prices, data, AI text), throttled. */
export async function refreshStaleGames(
  limit: number,
): Promise<{ updated: string[]; failed: string[] }> {
  const sources = await listStaleGameSources(limit);
  const updated: string[] = [];
  const failed: string[] = [];
  for (let i = 0; i < sources.length; i++) {
    if (i > 0) await sleep(DELAY_MS);
    const { slug, sourceUrl } = sources[i];
    try {
      const game = await enrichWithAi(await fetchPsnGame(sourceUrl));
      await saveGame(game, sourceUrl);
      updated.push(slug);
    } catch {
      failed.push(slug);
    }
  }
  return { updated, failed };
}
