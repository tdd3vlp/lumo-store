export type Product = {
  denominationId: string;
  productType: string;
  displayName: string;
  image: string;
  region: string;
  currency: string;
  amountMajor: number;
  /** Retail price in ruble minor units (kopecks); null when not yet priced. */
  salePriceMinor: number | null;
  inStock: boolean;
};
