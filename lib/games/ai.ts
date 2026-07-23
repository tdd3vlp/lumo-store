// Not marked "server-only" (reads OPENAI_API_KEY at call time): reused by the
// periodic refresh CLI as well as server code. Never imported by client bundles.
import type { Game } from "./catalog";
import { fetchRussianDescriptions, type FetchedGame } from "./psn-fetch";

// Small OpenAI helper (Chat Completions via fetch — no SDK dependency). Used at
// add/refresh time to turn the ru-ua store description into a short Russian
// summary and to list what a non-Standard edition adds. Every function fails
// soft: no API key or any error → null/[] so a game still saves without AI text.

const MODEL = "gpt-4o-mini";
const ENDPOINT = "https://api.openai.com/v1/chat/completions";

async function chat(system: string, user: string, maxTokens: number): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.3,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

/** 2–3 sentence Russian summary of a game from its (HTML-stripped) store text. */
export async function summarizeGame(title: string, rawRu: string): Promise<string | null> {
  const text = rawRu.slice(0, 4000);
  if (text.length < 40) return null;
  return chat(
    "Ты пишешь краткие описания видеоигр для магазина на русском языке. " +
      "Верни 2–3 предложения о том, что это за игра и её жанр/суть. " +
      "Без маркетинговых клише, без упоминания предзаказа, цен, платформ и условий. Только текст.",
    `Игра: ${title}\n\nОписание из магазина:\n${text}`,
    250,
  );
}

/** Short Russian bullets of what a non-Standard edition adds, or [] if unknown. */
export async function editionExtras(
  title: string,
  editionName: string,
  rawRu: string,
): Promise<string[]> {
  const text = rawRu.slice(0, 4000);
  if (text.length < 40) return [];
  const out = await chat(
    "Ты извлекаешь состав изданий видеоигр. По описанию издания перечисли, что оно " +
      "ДОПОЛНИТЕЛЬНО включает по сравнению со стандартным изданием (бонусы, наборы, " +
      "пропуски, ранний доступ и т.п.). Ответь строго JSON-массивом коротких строк на " +
      "русском, например [\"Боевой пропуск\",\"Ранний доступ на 3 дня\"]. Если данных нет — [].",
    `Игра: ${title}\nИздание: ${editionName}\n\nОписание издания:\n${text}`,
    300,
  );
  if (!out) return [];
  try {
    const start = out.indexOf("[");
    const end = out.lastIndexOf("]");
    if (start < 0 || end < 0) return [];
    const arr = JSON.parse(out.slice(start, end + 1)) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.filter((x): x is string => typeof x === "string" && x.trim().length > 0).slice(0, 8);
  } catch {
    return [];
  }
}

/**
 * Adds a Russian summary and per-edition "extras" to a freshly-fetched game,
 * using the ru-ua store text. Fails soft: without an API key (or on any error)
 * the game is returned unchanged, just without AI text.
 */
export async function enrichWithAi(game: FetchedGame): Promise<Game> {
  const { conceptId, editionProductIds, ...base } = game;
  let desc: Awaited<ReturnType<typeof fetchRussianDescriptions>>;
  try {
    desc = await fetchRussianDescriptions(conceptId, editionProductIds);
  } catch {
    return base;
  }

  const summary = (await summarizeGame(base.title, desc.game)) ?? undefined;
  const editions = await Promise.all(
    base.editions.map(async (ed) => {
      const raw = desc.editions[ed.name];
      if (/\bstandard\b/i.test(ed.name) || !raw) return ed;
      const extras = await editionExtras(base.title, ed.name, raw);
      return extras.length ? { ...ed, extras } : ed;
    }),
  );
  return { ...base, summary, editions };
}
