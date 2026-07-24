// "Аккаунты PlayStation" — a ready-made PlayStation account of the chosen
// region for a fixed price (no denominations). Isomorphic config shared by the
// purchase page, cart, and admin.

export const PS_ACCOUNT_PRICE_MINOR = 19000; // 190 ₽

// At or below this many available accounts for a region, a Telegram alert fires
// after a delivery so stock can be topped up before it hits zero.
export const PS_ACCOUNT_LOW_STOCK = 3;

export const PS_ACCOUNT_REGION_ORDER = ["US", "TR", "IN", "PL"];

// Same PSN regions/labels as the PlayStation gift cards. `gen` is the genitive
// for "аккаунтами <…>".
export const PS_ACCOUNT_REGION_META: Record<string, { label: string; gen: string }> = {
  US: { label: "США", gen: "США" },
  UK: { label: "Великобритания", gen: "Великобритании" },
  TR: { label: "Турция", gen: "Турции" },
  IN: { label: "Индия", gen: "Индии" },
  PL: { label: "Польша", gen: "Польши" },
};

export function psAccountRegionLabel(region: string): string {
  return PS_ACCOUNT_REGION_META[region]?.label ?? region;
}
