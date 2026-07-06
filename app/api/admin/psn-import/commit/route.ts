import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/auth/admin";
import { claimJob, createJob, getStagedJobMeta } from "@/lib/psn/db";
import { commitStagedJob } from "@/lib/psn/importer";

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

export async function POST(request: Request) {
  const denied = await guard();
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { stagedJobId, saleEndDate, collectionName } = body as Record<string, unknown>;

  if (typeof stagedJobId !== "string" || !stagedJobId) {
    return Response.json({ error: "stagedJobId is required" }, { status: 400 });
  }
  if (saleEndDate !== undefined && saleEndDate !== null && typeof saleEndDate !== "string") {
    return Response.json({ error: "saleEndDate must be a string or null" }, { status: 400 });
  }
  if (saleEndDate && !/^\d{4}-\d{2}-\d{2}$/.test(saleEndDate as string)) {
    return Response.json({ error: "saleEndDate must be YYYY-MM-DD" }, { status: 400 });
  }

  try {
    const meta = await getStagedJobMeta(stagedJobId);
    if (!meta) {
      return Response.json(
        { error: "Staged job not found or not a completed dry run" },
        { status: 404 },
      );
    }

    const jobId = await createJob({
      region: meta.region,
      categoryUrl: meta.categoryUrl,
      pageFrom: 1,
      pageTo: 1,
      dryRun: false,
      saleEndDate: (saleEndDate as string | null | undefined) ?? meta.saleEndDate,
    });

    setImmediate(async () => {
      try {
        if (await claimJob(jobId)) {
          await commitStagedJob(jobId, {
            stagedJobId,
            saleEndDate: (saleEndDate as string | null | undefined) ?? null,
            collectionName: (collectionName as string | null | undefined) ?? null,
          });
        }
      } catch (err) {
        console.error("[psn-import/commit] unhandled error in job", jobId, err);
      }
    });

    return Response.json({ jobId }, { status: 202 });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
