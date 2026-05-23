import { Hono } from "hono";
import { cors } from "hono/cors";
import { ApiError } from "./lib/errors.js";
import { newRequestId } from "./lib/ids.js";
import { bearerAuth } from "./auth.js";
import { ErrorCodes } from "@redline/shared";
import { vendorsRoute } from "./routes/vendors.js";
import { streamRoute } from "./routes/stream.js";
import { billingRoute } from "./routes/billing.js";
import { stripeWebhookRoute } from "./routes/webhooks-stripe.js";
import { evidenceRoute } from "./routes/evidence.js";

export function buildApp(): Hono {
  const app = new Hono();

  app.use("*", cors({ origin: (origin) => origin ?? "*", credentials: true }));

  app.use("*", async (c, next) => {
    const incoming = c.req.header("x-request-id");
    const requestId = incoming ?? newRequestId();
    c.set("requestId", requestId);
    c.header("x-request-id", requestId);
    await next();
  });

  app.use("*", bearerAuth);

  app.get("/health", (c) => c.json({ ok: true }));

  app.route("/v1/vendors", vendorsRoute);
  app.route("/v1/stream", streamRoute);
  app.route("/v1/billing", billingRoute);
  app.route("/webhooks/stripe", stripeWebhookRoute);
  app.route("/v1/evidence", evidenceRoute);

  app.notFound((c) =>
    c.json(
      {
        error: {
          code: ErrorCodes.NotFound,
          message: `No route for ${c.req.method} ${c.req.path}`,
          requestId: c.get("requestId"),
        },
      },
      404,
    ),
  );

  app.onError((err, c) => {
    const requestId = c.get("requestId");
    if (err instanceof ApiError) {
      return c.json(err.toEnvelope(requestId), err.status as never);
    }
    // eslint-disable-next-line no-console
    console.error(`[${requestId}] unexpected error:`, err);
    return c.json(
      {
        error: {
          code: ErrorCodes.Internal,
          message: "Internal server error",
          requestId,
        },
      },
      500,
    );
  });

  return app;
}
