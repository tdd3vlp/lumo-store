import { getPublishedProducts } from "@/lib/products/storefront";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const products = await getPublishedProducts();
    return Response.json({ products });
  } catch {
    // An empty catalog is a safer fallback than fabricated products.
    return Response.json({ products: [] });
  }
}
