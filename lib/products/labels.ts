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
};

export function productTypeLabel(productType: string): string {
  return (
    PRODUCT_TYPE_LABELS[productType] ??
    productType.charAt(0).toUpperCase() + productType.slice(1)
  );
}
