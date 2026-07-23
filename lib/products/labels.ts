// Russian storefront section titles per product_type. Unknown types fall back
// to a capitalized form of the raw type in the UI.
export const PRODUCT_TYPE_LABELS: Record<string, string> = {
  playstation: "PlayStation",
  steam: "Steam",
  apple: "App Store / iTunes",
  xbox: "Xbox",
  googleplay: "Google Play",
  nintendo: "Nintendo",
  roblox: "Roblox",
  discord: "Discord",
  telegram: "Telegram Stars",
};

export function productTypeLabel(productType: string): string {
  return (
    PRODUCT_TYPE_LABELS[productType] ??
    productType.charAt(0).toUpperCase() + productType.slice(1)
  );
}

export const REGION_LABELS: Record<string, string> = {
  TR: "Турция",
  US: "США",
  EU: "Европа",
  GLOBAL: "Глобальный",
  RU: "Россия",
  IN: "Индия",
  UK: "Великобритания",
  DE: "Германия",
  FR: "Франция",
  ES: "Испания",
  IT: "Италия",
  NL: "Нидерланды",
  BE: "Бельгия",
  AT: "Австрия",
  PT: "Португалия",
  IE: "Ирландия",
  FI: "Финляндия",
  GR: "Греция",
  SK: "Словакия",
  LU: "Люксембург",
  PL: "Польша",
};

export function regionLabel(region: string): string {
  return REGION_LABELS[region] ?? region;
}
