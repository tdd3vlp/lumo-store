import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/auth/admin";
import { getJobEvents, getJobStatus } from "@/lib/psn/db";

export const dynamic = "force-dynamic";

const POLL_INTERVAL_MS = 1_000;
const KEEPALIVE_MS = 15_000;
// Close only after this long with NO new events — genuine inactivity, not a
// hard cap. A 100-page import at 5–7s/page runs well past 5 min and must stay
// connected as long as events keep flowing.
const IDLE_TIMEOUT_MS = 5 * 60 * 1_000;

const TERMINAL_STATUSES = new Set(["done", "failed", "cancelled"]);

function sseLine(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    return new Response("Forbidden", { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");
  if (!jobId) {
    return new Response("Missing jobId", { status: 400 });
  }

  const encoder = new TextEncoder();
  let lastEventId = 0;
  let lastActivityAt = Date.now();
  let lastKeepaliveAt = Date.now();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true; // client disconnected
        }
      };

      enqueue(": connected\n\n");

      while (!closed) {
        let sawNewEvents = false;

        try {
          const events = await getJobEvents(jobId, lastEventId);
          for (const ev of events) {
            const id = Number(ev.id);
            enqueue(
              sseLine(ev.event_type as string, {
                id,
                message: ev.message,
                payload: ev.payload,
                createdAt: ev.created_at,
              }),
            );
            lastEventId = id;
            sawNewEvents = true;
          }
        } catch {
          // Transient read failure — keep the stream open and retry next tick.
          // Lifecycle is driven by job status below, not by a single read error.
        }

        const now = Date.now();
        if (sawNewEvents) {
          lastActivityAt = now;
        }

        // Stream lifecycle follows the job's terminal STATUS, not event types.
        // This drains any remaining events first, then ends cleanly — a
        // recoverable "warning"/"error" event never closes the stream.
        let status: string | null = null;
        try {
          status = await getJobStatus(jobId);
        } catch {
          // ignore; retry next tick
        }

        if (status === null) {
          enqueue(sseLine("end", { status: "missing" }));
          break;
        }

        if (TERMINAL_STATUSES.has(status)) {
          // One more drain pass to flush events written just before the status flip.
          try {
            const tail = await getJobEvents(jobId, lastEventId);
            for (const ev of tail) {
              enqueue(
                sseLine(ev.event_type as string, {
                  id: Number(ev.id),
                  message: ev.message,
                  payload: ev.payload,
                  createdAt: ev.created_at,
                }),
              );
              lastEventId = Number(ev.id);
            }
          } catch {
            // best effort
          }
          enqueue(sseLine("end", { status }));
          break;
        }

        if (now - lastActivityAt > IDLE_TIMEOUT_MS) {
          enqueue(sseLine("timeout", { message: "No activity — stream idle-closed" }));
          break;
        }

        if (now - lastKeepaliveAt > KEEPALIVE_MS) {
          enqueue(": keepalive\n\n");
          lastKeepaliveAt = now;
        }

        await new Promise<void>((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      }

      try {
        controller.close();
      } catch {
        // already closed
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
