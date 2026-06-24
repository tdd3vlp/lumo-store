const KNOWN_EDITION_PATTERNS = [
  /Complete Edition Remastered Digital Deluxe Edition/i,
  /Digital Deluxe Edition/i,
  /Monday Night War Edition/i,
  /Collector'?s Edition/i,
  /Definitive Edition/i,
  /Anniversary Edition/i,
  /Game of the Year Edition/i,
  /Cross-Gen (?:Edition|Bundle)/i,
  /Vault Edition/i,
  /Phantom Edition/i,
  /Ultimate Edition/i,
  /Complete Edition(?: Remastered)?/i,
  /Premium Edition/i,
  /Gold Edition/i,
  /Special Edition/i,
  /Deluxe Edition/i,
  /Essentials Edition/i,
  /Midnight Edition/i,
  /Year \d+ Edition/i,
  /Standard Edition/i,
  /Overture Bundle/i,
  /MVP Bundle/i,
] as const;

function normalizeEditionLabel(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/\bDigital deluxe\b/i, "Digital Deluxe")
    .trim();
}

export function inferEditionName(title: string) {
  for (const pattern of KNOWN_EDITION_PATTERNS) {
    const match = title.match(pattern);
    if (match) return normalizeEditionLabel(match[0]);
  }

  const namedEdition = title.match(
    /\b([\p{L}\p{N}][\p{L}\p{N}'’+-]*(?:\s+[\p{L}\p{N}][\p{L}\p{N}'’+-]*){0,2}\s+Edition)\b/iu,
  );
  if (namedEdition) return normalizeEditionLabel(namedEdition[1]);

  const namedBundle = title.match(
    /\b([\p{L}\p{N}][\p{L}\p{N}'’+-]*(?:\s+[\p{L}\p{N}][\p{L}\p{N}'’+-]*){0,1}\s+Bundle)\b/iu,
  );
  if (namedBundle) return normalizeEditionLabel(namedBundle[1]);

  return "Standard Edition";
}

