/**
 * PSN import worker.
 *
 * Reliable backstop for the fire-and-forget POST fast-path: claims pending jobs
 * (atomically, FOR UPDATE SKIP LOCKED) and runs them. Run this as a long-lived
 * process so jobs are never lost if the web process restarts between accepting
 * a job (202) and starting it.
 *
 *   tsx scripts/psn/worker.ts
 *
 * Safe to run alongside the web process: the per-job claim guarantees a job
 * executes exactly once, and the global advisory lock serializes imports.
 */

import "../env";
import { claimNextPendingJob, reapStaleJobs } from "../../lib/psn/db";
import { runImportJob } from "../../lib/psn/importer";

const IDLE_POLL_MS = 5_000;

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

let shuttingDown = false;
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    console.log(`\n[psn-worker] ${signal} received — finishing current job then exiting`);
    shuttingDown = true;
  });
}

// On boot, reap only STALE running jobs (no heartbeat for 15+ min) left by a
// previous crashed worker. Live imports on another worker keep a fresh
// updated_at and are spared.
const reaped = await reapStaleJobs();
if (reaped > 0) console.log(`[psn-worker] reaped ${reaped} stale job(s)`);
console.log("[psn-worker] started — polling for pending jobs");

while (!shuttingDown) {
  let job;
  try {
    job = await claimNextPendingJob();
  } catch (err) {
    console.error("[psn-worker] failed to claim job:", (err as Error).message);
    await sleep(IDLE_POLL_MS);
    continue;
  }

  if (!job) {
    await sleep(IDLE_POLL_MS);
    continue;
  }

  console.log(
    `[psn-worker] running job ${job.id} (${job.region}, pages ${job.pageFrom}–${job.pageTo}${job.dryRun ? ", dry-run" : ""})`,
  );

  try {
    await runImportJob(job.id, {
      region: job.region,
      categoryUrl: job.categoryUrl,
      pageFrom: job.pageFrom,
      pageTo: job.pageTo,
      dryRun: job.dryRun,
    });
    console.log(`[psn-worker] job ${job.id} finished`);
  } catch (err) {
    console.error(`[psn-worker] job ${job.id} crashed:`, (err as Error).message);
  }
}

console.log("[psn-worker] stopped");
process.exit(0);
