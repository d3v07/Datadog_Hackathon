import { Hono } from "hono";
import { createAuthMiddleware, type SeedToken } from "./auth.js";
import { InMemoryChangeReportRepository, type ChangeReportRepository } from "./db/changeReports.js";
import { errorResponse } from "./errors.js";
import { logger } from "./logger.js";
import { createChangesRouter } from "./routes/changes.js";
import { createStreamRouter } from "./routes/stream.js";
import { EventBroker } from "./stream/events.js";

export interface AppDeps {
  reports?: ChangeReportRepository;
  events?: EventBroker;
  seedData?: {
    tokens?: SeedToken[];
  };
  now?: () => Date;
}

export function createApp(deps: AppDeps = {}): Hono {
  const reports = deps.reports ?? new InMemoryChangeReportRepository();
  const events = deps.events ?? new EventBroker();
  const app = new Hono();

  app.get("/health", (c) => c.json({ ok: true }));
  app.use("/v1/*", createAuthMiddleware(deps.seedData?.tokens));
  app.route("/v1/changes", createChangesRouter({ reports, events, now: deps.now }));
  app.route("/v1/stream", createStreamRouter({ events }));
  app.notFound((c) => errorResponse(c, 404, "not-found", "Route not found"));
  app.onError((err, c) => {
    logger.error(
      {
        err,
        method: c.req.raw.method,
        path: new URL(c.req.url).pathname,
        requestId: c.req.header("x-request-id"),
      },
      "Unhandled API error",
    );

    return errorResponse(c, 500, "internal", "Internal server error");
  });

  return app;
}
