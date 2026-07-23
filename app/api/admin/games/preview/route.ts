import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/auth/admin";
import { priceGames } from "@/lib/games/pricing";
import { fetchPsnGame, PsnFetchError } from "@/lib/games/psn-fetch";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function guard(): Promise<Response | null> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return Response.json({ error: "Not authenticated" }, { status: 401 });
  if (!isAdminEmail(email)) return Response.json({ error: "Forbidden" }, { status: 403 });
  return null;
}

/** Parse a PSN URL and price it — the "проверка стоимости" step, no save. */
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
    const game = await fetchPsnGame(url);
    const [priced] = await priceGames([game]);
    return Response.json({ game, priced });
  } catch (error) {
    if (error instanceof PsnFetchError) {
      return Response.json({ error: error.message }, { status: 422 });
    }
    return Response.json({ error: "Не удалось обработать ссылку." }, { status: 500 });
  }
}
