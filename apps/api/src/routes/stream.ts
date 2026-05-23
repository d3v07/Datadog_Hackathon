import { Hono } from "hono";
import type { EventBroker, StreamEvent } from "../stream/events.js";

export interface StreamRouteDeps {
  events: EventBroker;
}

function formatSseEvent(event: StreamEvent): string {
  return `id: ${event.id}\nevent: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`;
}

export function createStreamRouter(deps: StreamRouteDeps): Hono {
  const router = new Hono();

  router.get("/", (c) => {
    const auth = c.get("auth");
    const encoder = new TextEncoder();

    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        const write = (chunk: string) => controller.enqueue(encoder.encode(chunk));
        const unsubscribe = deps.events.subscribe(auth.orgId, (event) => write(formatSseEvent(event)));
        const heartbeat = setInterval(() => write(":heartbeat\n\n"), 15_000);

        c.req.raw.signal.addEventListener(
          "abort",
          () => {
            clearInterval(heartbeat);
            unsubscribe();
            try {
              controller.close();
            } catch {
              // The stream can already be closed by the runtime after abort.
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

