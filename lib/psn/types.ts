export type PsnRegion = "TR" | "UA";
export type PsnLocale = "en-tr" | "ru-ua";

export const LOCALE_BY_REGION: Record<PsnRegion, PsnLocale> = {
  TR: "en-tr",
  UA: "ru-ua",
};

export const ALLOWED_STORE_PREFIXES = [
  "https://store.playstation.com/en-tr/",
  "https://store.playstation.com/ru-ua/",
] as const;

export const WELL_KNOWN_COLLECTIONS = {
  NEW_RELEASES: "Новинки",
  PREORDERS: "Предзаказы",
} as const;

export type ParsedCategoryProduct = {
  psnProductId: string;
  npTitleId: string | null;
  name: string;
  imageUrl: string | null;
  priceMinor: number | null;
  originalPriceMinor: number | null;
  currencyCode: string | null;
  platforms: string[];
};

export type ParsedProductDetail = {
  psnProductId: string;
  npTitleId: string | null;
  name: string;
  imageUrl: string | null;
  shortDescription: string | null;
  longDescriptionHtml: string | null;
  longDescriptionText: string | null;
  longDescriptionRuHtml: string | null;
  longDescriptionRuText: string | null;
  publisher: string | null;
  releaseDate: string | null;
  platforms: string[];
  genres: string[];
  voiceLanguages: string[];
  subtitleLanguages: string[];
  rating: number | null;
  ratingsCount: number | null;
  screenshotUrls: string[];
  rawJson: Record<string, unknown>;
};

export type ImportJobStatus = "pending" | "running" | "done" | "failed" | "cancelled";

export type ImportJobOptions = {
  region: PsnRegion;
  categoryUrl: string;
  pageFrom: number;
  pageTo: number;
  dryRun: boolean;
  saleEndDate?: string | null;
  collectionName?: string | null;
};

// "warning" = recoverable issue (page/upsert failure), job continues.
// "error"   = fatal, job is failing. "done" = success. Terminal status drives
// stream lifecycle; clients must not treat "warning"/"error" alone as the end.
export type JobEvent = {
  type: "info" | "page" | "product" | "warning" | "error" | "done";
  message: string;
  payload?: Record<string, unknown>;
};

export type PendingJobRow = {
  id: string;
  region: PsnRegion;
  categoryUrl: string;
  pageFrom: number;
  pageTo: number;
  dryRun: boolean;
};
