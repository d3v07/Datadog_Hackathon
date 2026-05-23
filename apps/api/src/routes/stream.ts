import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { ApiError } from "../lib/errors.js";
import { ErrorCodes } from "@redline/shared";
import { resolveBearer } from "../seed/loader.js";
import { bus } from "../lib/bus.js";

// SSE channel. EventSource has no header support so auth comes via ?token=.
// The route is mounted at /v1/stream (root path inside this sub-app).

export const streamRoute = new Hono();

const HEARTBEAT_MS = 15_000;

streamRoute.get("/", (c) => {
  const token = c.req.query("token");
  if (!token) {
    throw new ApiError(
      ErrorCodes.Unauthenticated,
      "Missing token query parameter",
    );
  }
  const orgId = resolveBearer(token);
  if (!orgId) {
    throw new ApiError(
      ErrorCodes.Unauthenticated,
      "Invalid token",
    );
  }
  const lastEventId = c.req.header("last-event-id") ?? undefined;

  return streamSSE(c, async (stream) => {
    const heartbeat = setInterval(() => {
      stream.writeSSE({ event: "heartbeat", data: "" }).catch(() => {
        clearInterval(heartbeat);
      });
    }, HEARTBEAT_MS);

    const unsubscribe = bus.subscribe(
      orgId,
      (env) => {
        const payload = env.payload;
        stream
          .writeSSE({
            id: env.id,
            event: payload.event,
            data: JSON.stringify(payload.data),
          })
          .catch(() => {
            // The client disconnected; teardown happens via abort.
          });
      },
      lastEventId,
    );

    await new Promise<void>((resolve) => {
      stream.onAbort(() => {
        clearInterval(heartbeat);
        unsubscribe();
        resolve();
      });
    });
  });
});
