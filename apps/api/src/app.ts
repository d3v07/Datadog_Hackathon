import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "@hono/node-server/serve-static";
import { createAuthMiddleware, type SeedToken } from "./auth.js";
import { InMemoryChangeReportRepository, type ChangeReportRepository } from "./db/changeReports.js";
import { errorResponse } from "./errors.js";
import { ApiError } from "./lib/errors.js";
import { newRequestId } from "./lib/ids.js";
import { logger } from "./logger.js";
import { billingRoute } from "./routes/billing.js";
import { createChangesRouter } from "./routes/changes.js";
import { dashboardRoute } from "./routes/dashboard.js";
import { evidenceRoute } from "./routes/evidence.js";
import { createStreamRouter } from "./routes/stream.js";
import { vendorsRoute } from "./routes/vendors.js";
import { stripeWebhookRoute } from "./routes/webhooks-stripe.js";
import { createEventBroker, type EventBroker } from "./stream/broker.js";

export interface AppDeps {
  reports?: ChangeReportRepository;
  events?: EventBroker;
  heartbeatIntervalMs?: number;
  seedData?: {
    tokens?: SeedToken[];
  };
  now?: () => Date;
}

export function createApp(deps: AppDeps = {}): Hono {
  const reports = deps.reports ?? new InMemoryChangeReportRepository();
  const events = deps.events ?? createEventBroker();
  const app = new Hono();

  app.use("*", cors({ origin: (origin) => origin ?? "*", credentials: true }));
  app.use("*", async (c, next) => {
    const requestId = c.req.header("x-request-id") ?? newRequestId();
    c.set("requestId", requestId);
    c.header("x-request-id", requestId);
    await next();
  });

  app.get("/health", (c) => c.json({ ok: true }));
  app.route("/webhooks/stripe", stripeWebhookRoute);
  app.route("/v1/evidence", evidenceRoute);
  app.use("/v1/*", createAuthMiddleware(deps.seedData?.tokens));
  app.route("/v1/vendors", vendorsRoute);
  app.route("/v1/billing", billingRoute);
  app.route("/v1/dashboard", dashboardRoute);
  app.route("/v1/changes", createChangesRouter({ reports, events, ...(deps.now ? { now: deps.now } : {}) }));
  app.route(
    "/v1/stream",
    createStreamRouter({ events, ...(deps.heartbeatIntervalMs === undefined ? {} : { heartbeatIntervalMs: deps.heartbeatIntervalMs }) }),
  );
  app.use("/*", serveStatic({ root: "../../public" }));
  app.notFound((c) => errorResponse(c, 404, "not-found", "Route not found"));
  app.onError((err, c) => {
    const requestId = c.get("requestId");
    if (err instanceof ApiError) {
      return c.json(err.toEnvelope(requestId), err.status as never);
    }

    logger.error(
      {
        err,
        method: c.req.raw.method,
        path: new URL(c.req.url).pathname,
        requestId,
      },
      "Unhandled API error",
    );

    return errorResponse(c, 500, "internal", "Internal server error");
  });

  return app;
}
