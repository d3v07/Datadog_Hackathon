import { Hono } from "hono";
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
        const write = (chunk: string) => controller.enqueue(encoder.encode(chunk));
        const replayed = deps.events.replayAfter(auth.orgId, lastEventId);

        for (const event of replayed) {
          write(formatSseEvent(event));
        }

        const unsubscribe = deps.events.subscribe(auth.orgId, (event) => write(formatSseEvent(event)));
        const heartbeat = setInterval(() => write(formatHeartbeat()), heartbeatIntervalMs);

        c.req.raw.signal.addEventListener(
          "abort",
          () => {
            clearInterval(heartbeat);
            unsubscribe();
            try {
              controller.close();
            } catch {
              // Runtimes can close the stream as part of abort handling.
            }
          },
          { once: true },
        );
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
