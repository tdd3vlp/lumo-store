// Per-product-type brand accents used to render templated covers when a product
// has no image_url. Colors are our own presentation, not official brand assets.
export type BrandAccent = {
  from: string;
  to: string;
  text: string;
};

const BRAND_ACCENTS: Record<string, BrandAccent> = {
  steam: { from: "#1b2838", to: "#2a475e", text: "#ffffff" },
  playstation: { from: "#00379a", to: "#0070d1", text: "#ffffff" },
  apple: { from: "#2b2b2f", to: "#0a0a0a", text: "#ffffff" },
  xbox: { from: "#107c10", to: "#0b5c0b", text: "#ffffff" },
  googleplay: { from: "#0f9d58", to: "#0b7a44", text: "#ffffff" },
  nintendo: { from: "#e60012", to: "#a8000d", text: "#ffffff" },
  roblox: { from: "#22252a", to: "#00a2ff", text: "#ffffff" },
  discord: { from: "#5865f2", to: "#3b45c4", text: "#ffffff" },
};

const DEFAULT_ACCENT: BrandAccent = {
  from: "#242129",
  to: "#15131b",
  text: "#d8ff3e",
};

export function brandAccent(productType: string): BrandAccent {
  return BRAND_ACCENTS[productType] ?? DEFAULT_ACCENT;
}

// Curated storefront region allow-list per product type. Types absent here
// show every region present in the catalog, unfiltered. Regions listed but
// not yet stocked simply render no items — this narrows which regions are
// *offered*, it does not invent inventory.
const REGION_ALLOWLIST: Record<string, string[]> = {
  apple: ["RU", "US", "TR"],
  playstation: ["TR", "IN", "US", "PL", "UK"],
  xbox: ["US", "TR", "EU"],
};

export function allowedRegions(productType: string): string[] | null {
  return REGION_ALLOWLIST[productType] ?? null;
}
