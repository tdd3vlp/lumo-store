import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/auth/admin";
import { claimJob, createJob, listJobs } from "@/lib/psn/db";
import { runImportJob } from "@/lib/psn/importer";
import { LOCALE_BY_REGION } from "@/lib/psn/types";
import type { ImportJobOptions, PsnRegion } from "@/lib/psn/types";

export const dynamic = "force-dynamic";

async function guard(): Promise<Response | null> {
  const session = await auth();
  if (!session?.user?.email) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!isAdminEmail(session.user.email)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function GET() {
  const denied = await guard();
  if (denied) return denied;

  try {
    const jobs = await listJobs(30);
    return Response.json({ jobs });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const denied = await guard();
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    region,
    categoryUrl,
    pageFrom = 1,
    pageTo,
    dryRun = false,
  } = body as Record<string, unknown>;

  // Validate
  if (!["TR", "UA"].includes(region as string)) {
    return Response.json({ error: "region must be TR or UA" }, { status: 400 });
  }
  // The URL's locale must match the selected region, otherwise e.g. en-in prices
  // would be stored as TR products. This is stricter than the bare allowlist.
  const requiredPrefix = `https://store.playstation.com/${LOCALE_BY_REGION[region as PsnRegion]}/`;
  if (typeof categoryUrl !== "string" || !categoryUrl.startsWith(requiredPrefix)) {
    return Response.json(
      {
        error: `categoryUrl for region ${region} must start with ${requiredPrefix}`,
        requiredPrefix,
      },
      { status: 400 },
    );
  }
  if (typeof pageTo !== "number" || pageTo < 1 || pageTo > 100) {
    return Response.json({ error: "pageTo must be 1–100" }, { status: 400 });
  }
  const from = typeof pageFrom === "number" ? pageFrom : 1;
  if (from < 1 || from > pageTo) {
    return Response.json({ error: "pageFrom must be ≥ 1 and ≤ pageTo" }, { status: 400 });
  }

  const opts: ImportJobOptions = {
    region: region as PsnRegion,
    categoryUrl,
    pageFrom: from,
    pageTo,
    dryRun: Boolean(dryRun),
  };

  try {
    // No reaping here: a per-request blanket reap would mark a concurrently
    // running import as failed. Orphan recovery is the worker's job (lease-based
    // reapStaleJobs on boot).
    const jobId = await createJob(opts);

    // Fire-and-forget fast path: claim the job (pending → running) then run it,
    // writing events to the DB. The claim is atomic, so if a worker also picks
    // up this job only one of them executes it. If this process dies before the
    // claim, the job stays `pending` and the worker (scripts/psn/worker.ts)
    // will run it — no job is lost after the 202.
    setImmediate(async () => {
      try {
        if (await claimJob(jobId)) {
          await runImportJob(jobId, opts);
        }
      } catch (err) {
        console.error("[psn-import] unhandled error in job", jobId, err);
      }
    });

    return Response.json({ jobId }, { status: 202 });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
