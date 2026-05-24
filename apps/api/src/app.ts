import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "@hono/node-server/serve-static";
import { fileURLToPath } from "node:url";
import { dirname, resolve, relative } from "node:path";
import { createAuthMiddleware, type SeedToken } from "./auth.js";
import { InMemoryChangeReportRepository, type ChangeReportRepository } from "./db/changeReports.js";
import { errorResponse } from "./errors.js";
import { ApiError } from "./lib/errors.js";
import { newRequestId } from "./lib/ids.js";
import { logger } from "./logger.js";
import { billingRoute } from "./routes/billing.js";
import { createChangesRouter } from "./routes/changes.js";
import { dashboardRoute } from "./routes/dashboard.js";
import { createEvidenceRouter } from "./routes/evidence.js";
import { createStreamRouter } from "./routes/stream.js";
import { vendorsRoute } from "./routes/vendors.js";
import { stripeWebhookRoute } from "./routes/webhooks-stripe.js";
import { createEventBroker, type EventBroker } from "./stream/broker.js";

// serveStatic resolves `root` against process.cwd(). Compute the public/
// directory as a cwd-relative string so the API serves the static frontend
// no matter where the process is launched from (apps/api or repo root).
const PUBLIC_DIR_ABS = resolve(dirname(fileURLToPath(import.meta.url)), "../../../public");
const PUBLIC_DIR_REL = (() => {
  const rel = relative(process.cwd(), PUBLIC_DIR_ABS);
  return rel === "" ? "." : rel;
})();

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
  app.route("/v1/evidence", createEvidenceRouter(reports));
  app.use("/v1/*", createAuthMiddleware(deps.seedData?.tokens));
  app.route("/v1/vendors", vendorsRoute);
  app.route("/v1/billing", billingRoute);
  app.route("/v1/dashboard", dashboardRoute);
  app.route("/v1/changes", createChangesRouter({ reports, events, ...(deps.now ? { now: deps.now } : {}) }));
  app.route(
    "/v1/stream",
    createStreamRouter({ events, ...(deps.heartbeatIntervalMs === undefined ? {} : { heartbeatIntervalMs: deps.heartbeatIntervalMs }) }),
  );

  // Static frontend — serves /public/* from the repo so the API can host the
  // landing page and demo UI on the same origin. A request to "/" resolves to
  // /public/index.html; "/app/" to /public/app/index.html. Mounted AFTER all
  // API routes so /v1, /health, /webhooks etc. still match first.
  app.use("/*", serveStatic({ root: PUBLIC_DIR_REL }));
  app.use("/", serveStatic({ root: PUBLIC_DIR_REL, path: "index.html" }));
  app.use("/app/", serveStatic({ root: PUBLIC_DIR_REL, path: "app/index.html" }));

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
