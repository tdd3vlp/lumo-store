import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/auth/admin";
import { getStock } from "@/lib/ns-gifts/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function guard(): Promise<Response | null> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return Response.json({ error: "Not authenticated" }, { status: 401 });
  if (!isAdminEmail(email)) return Response.json({ error: "Forbidden" }, { status: 403 });
  return null;
}

export type NsGiftsCatalogItem = {
  serviceId: number;
  name: string;
  categoryName: string;
  price: number;
  currency: string;
  inStock: number;
};

export async function GET() {
  const denied = await guard();
  if (denied) return denied;

  try {
    const { categories } = await getStock();
    const items: NsGiftsCatalogItem[] = categories.flatMap((category) =>
      category.services.map((service) => ({
        serviceId: service.service_id,
        name: service.service_name,
        categoryName: category.category_name,
        price: service.price,
        currency: service.currency,
        inStock: service.in_stock,
      })),
    );
    return Response.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load NS.gifts catalog";
    return Response.json({ error: message }, { status: 502 });
  }
}
