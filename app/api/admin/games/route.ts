import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/auth/admin";
import { enrichWithAi } from "@/lib/games/ai";
import { fetchPsnGame, PsnFetchError } from "@/lib/games/psn-fetch";
import { deleteGame, listDbGames, saveGame } from "@/lib/games/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function guard(): Promise<Response | null> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return Response.json({ error: "Not authenticated" }, { status: 401 });
  if (!isAdminEmail(email)) return Response.json({ error: "Forbidden" }, { status: 403 });
  return null;
}

export async function GET() {
  const denied = await guard();
  if (denied) return denied;
  return Response.json({ games: await listDbGames() });
}

/** Re-fetch the URL server-side (freshest prices) and save. */
export async function POST(request: Request) {
  const denied = await guard();
  if (denied) return denied;

  let url = "";
  try {
    const body = (await request.json()) as Record<string, unknown>;
    url = typeof body.url === "string" ? body.url.trim() : "";
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!/^https:\/\/store\.playstation\.com\//i.test(url)) {
    return Response.json({ error: "Вставьте ссылку на store.playstation.com." }, { status: 400 });
  }

  try {
    const fetched = await fetchPsnGame(url);
    const game = await enrichWithAi(fetched);
    await saveGame(game, url);
    return Response.json({ ok: true, games: await listDbGames() });
  } catch (error) {
    if (error instanceof PsnFetchError) {
      return Response.json({ error: error.message }, { status: 422 });
    }
    const message = error instanceof Error ? error.message : "Не удалось сохранить игру.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const denied = await guard();
  if (denied) return denied;

  const slug = new URL(request.url).searchParams.get("slug")?.trim();
  if (!slug) return Response.json({ error: "slug обязателен" }, { status: 400 });

  try {
    await deleteGame(slug);
    return Response.json({ ok: true, games: await listDbGames() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось удалить игру.";
    return Response.json({ error: message }, { status: 500 });
  }
}
