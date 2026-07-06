import { LOCALE_BY_REGION } from "./types";
import type { PsnRegion } from "./types";

/**
 * Build the URL for a given category page.
 *
 * PS Store category pagination lives in the last path segment
 * (`/{locale}/category/{id}/{page}`). We normalize via `URL` so query strings
 * and hashes don't corrupt the path — e.g. `/category/abc/1?foo=bar#x` → `.../abc/2`.
 */
export function buildCategoryPageUrl(baseUrl: string, page: number): string {
  const url = new URL(baseUrl);
  url.search = "";
  url.hash = "";

  const segments = url.pathname.split("/");
  // Drop an empty trailing segment caused by a trailing slash.
  if (segments[segments.length - 1] === "") segments.pop();

  const last = segments[segments.length - 1];
  if (/^\d+$/.test(last)) {
    segments[segments.length - 1] = String(page);
  } else {
    segments.push(String(page));
  }

  url.pathname = segments.join("/");
  return url.toString();
}

export function buildProductUrl(region: PsnRegion, psnProductId: string): string {
  const locale = LOCALE_BY_REGION[region];
  return `https://store.playstation.com/${locale}/product/${psnProductId}`;
}
