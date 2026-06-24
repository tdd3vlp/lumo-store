const EDITION_WORDS =
  /\b(standard|digital|deluxe|ultimate|complete|premium|gold|special|collector'?s?|cross-gen|bundle|edition|editions)\b/gi;

export function normalizeProductTitle(title: string) {
  return title
    .replace(/[™®©]/g, "")
    .normalize("NFKD")
    .replace(/\bPS[45]\b/gi, "")
    .replace(/PS4\s*(?:&|\/|\+)\s*PS5/gi, "")
    .replace(EDITION_WORDS, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function tokens(value: string) {
  return new Set(normalizeProductTitle(value).split(" ").filter(Boolean));
}

export function titleSimilarity(left: string, right: string) {
  const a = tokens(left);
  const b = tokens(right);

  if (a.size === 0 || b.size === 0) return 0;

  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection += 1;
  }

  return intersection / (a.size + b.size - intersection);
}

export function containsCyrillic(value: string) {
  return /[А-Яа-яЁёІіЇїЄє]/.test(value);
}
