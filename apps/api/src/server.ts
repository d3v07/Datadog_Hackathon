import { serve } from "@hono/node-server";
import { pathToFileURL } from "node:url";
import { createApp } from "./app.js";
import { InMemoryChangeReportRepository } from "./db/changeReports.js";
import { logger } from "./logger.js";
import { createSeedChangeReport } from "./seed/factories.js";
import type { ChangeReport, User, Vendor } from "@redline/shared";

const port = Number(process.env.PORT ?? 8787);
export const DEV_SEED_CHANGE_ID = "chg_seed_notion_yesterday";

export { createApp } from "./app.js";

export function createDevSeed() {
  const vendor: Vendor = {
    id: "vnd_notion" as Vendor["id"],
    orgId: "org_acme" as Vendor["orgId"],
    name: "Notion",
    ownerId: "usr_priya" as Vendor["ownerId"],
    renewalDate: "2026-08-21T00:00:00.000Z",
  };
  const user: User = {
    id: "usr_priya" as User["id"],
    orgId: "org_acme" as User["orgId"],
    name: "Priya Shah",
    email: "priya@example.com",
    role: "procurement",
    slackUserId: "U010PRIYA",
  };
  const users = [user];
  const change = createSeedChangeReport({
    id: DEV_SEED_CHANGE_ID as ChangeReport["id"],
    orgId: vendor.orgId,
    vendorId: vendor.id,
    runId: "run_seed_notion_yesterday" as ChangeReport["runId"],
    ownerId: user.id,
    detectedAt: "2026-05-22T14:42:18.000Z",
    severity: "P1",
    state: "new",
  });

  return {
    change,
    reports: new InMemoryChangeReportRepository([change]),
    users,
    vendor,
  };
}

export function createServerApp(argv = process.argv) {
  if (!argv.includes("--seed")) {
    return createApp();
  }

  const seed = createDevSeed();
  return createApp({ reports: seed.reports });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const seeded = process.argv.includes("--seed");
  serve(
    {
      fetch: createServerApp().fetch,
      port,
    },
    (info) => {
      logger.info({ port: info.port, seeded, ...(seeded ? { seedChangeId: DEV_SEED_CHANGE_ID } : {}) }, "Redline API listening");
    },
  );
}
