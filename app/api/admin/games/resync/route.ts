import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/auth/admin";
import { refreshStaleGames } from "@/lib/games/refresh";
import { countRefreshableGames, listDbGames } from "@/lib/games/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

// One click refreshes a small batch of the stalest games (throttled), not the
// whole catalog at once — so it never bursts PSN requests. Repeated clicks (and
// the periodic timer) cycle through the rest.
const BATCH = 6;

async function guard(): Promise<Response | null> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return Response.json({ error: "Not authenticated" }, { status: 401 });
  if (!isAdminEmail(email)) return Response.json({ error: "Forbidden" }, { status: 403 });
  return null;
}

export async function POST() {
  const denied = await guard();
  if (denied) return denied;

  const total = await countRefreshableGames();
  const { updated, failed } = await refreshStaleGames(BATCH);
  return Response.json({
    ok: true,
    updated: updated.length,
    failed,
    total,
    games: await listDbGames(),
  });
}
