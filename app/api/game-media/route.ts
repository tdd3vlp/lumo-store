import { psnDeals } from "@/data/psnDeals";

function collectPlayStationImages(html: string, coverImage: string) {
  const decoded = html
    .replaceAll("\\u002F", "/")
    .replaceAll("\\/", "/")
    .replaceAll("&amp;", "&");

  const matches =
    decoded.match(
      /https:\/\/image\.api\.playstation\.com\/[^"'<>\\\s]+?\.(?:jpe?g|webp)(?:\?[^"'<>\\\s]*)?/gi,
    ) ?? [];

  const coverPath = coverImage.split("?")[0];

  return Array.from(
    new Set(
      matches
        .map((url) => url.replaceAll("\\u0026", "&").split("?")[0])
        .filter((url) => url !== coverPath),
    ),
  ).slice(0, 12);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get("id"));
  const game = psnDeals.find((item) => item.id === id);

  if (!game) {
    return Response.json(
      { ok: false, error: "Game not found", screenshots: [] },
      { status: 404 },
    );
  }

  if (game.screenshots.length > 0) {
    return Response.json({ ok: true, screenshots: game.screenshots });
  }

  if (!game.psStoreUrl) {
    return Response.json({ ok: true, screenshots: [] });
  }

  try {
    const response = await fetch(game.psStoreUrl, {
      headers: {
        Accept: "text/html",
        "User-Agent": "Mozilla/5.0 (compatible; LumoSignal/1.0)",
      },
      next: { revalidate: 60 * 60 * 12 },
    });

    if (!response.ok) {
      throw new Error(`PlayStation Store request failed: ${response.status}`);
    }

    const html = await response.text();
    const screenshots = collectPlayStationImages(html, game.image);

    return Response.json({ ok: true, screenshots });
  } catch {
    return Response.json({ ok: true, screenshots: [] });
  }
}
