import { Hono } from "hono";
import type { StoredStreamEvent } from "@redline/shared";
import type { EventBroker } from "../stream/broker.js";
import { formatHeartbeat, formatSseEvent } from "../stream/events.js";

export interface StreamRouteDeps {
  events: EventBroker;
  heartbeatIntervalMs?: number;
}

export function createStreamRouter(deps: StreamRouteDeps): Hono {
  const router = new Hono();
  const heartbeatIntervalMs = deps.heartbeatIntervalMs ?? 15_000;

  router.get("/", (c) => {
    const auth = c.get("auth");
    const encoder = new TextEncoder();
    const lastEventId = c.req.header("last-event-id");

    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        let closed = false;
        let heartbeat: ReturnType<typeof setInterval> | undefined;
        let unsubscribe = () => {};
        const closeStream = () => {
          if (closed) {
            return;
          }

          closed = true;
          if (heartbeat) {
            clearInterval(heartbeat);
          }
          unsubscribe();
          try {
            controller.close();
          } catch {
            // Runtimes can close the stream as part of abort handling.
          }
        };
        const write = (chunk: string) => {
          if (closed) {
            return;
          }

          try {
            controller.enqueue(encoder.encode(chunk));
          } catch {
            closeStream();
          }
        };
        const buffered: StoredStreamEvent[] = [];
        let replaying = true;
        const replayedIds = new Set<string>();

        unsubscribe = deps.events.subscribe(auth.orgId, (event) => {
          if (replaying) {
            buffered.push(event);
            return;
          }

          write(formatSseEvent(event));
        });
        const replayed = deps.events.replayAfter(auth.orgId, lastEventId);

        for (const event of replayed) {
          replayedIds.add(event.id);
          write(formatSseEvent(event));
        }

        replaying = false;
        for (const event of buffered) {
          if (!replayedIds.has(event.id)) {
            write(formatSseEvent(event));
          }
        }

        if (closed) {
          return;
        }

        heartbeat = setInterval(() => write(formatHeartbeat()), heartbeatIntervalMs);

        c.req.raw.signal.addEventListener(
          "abort",
          closeStream,
          { once: true },
        );

        if (c.req.raw.signal.aborted) {
          closeStream();
        }
      },
    });

    return new Response(body, {
      headers: {
        "cache-control": "no-cache",
        connection: "keep-alive",
        "content-type": "text/event-stream; charset=utf-8",
        "x-accel-buffering": "no",
      },
    });
  });

  return router;
}
