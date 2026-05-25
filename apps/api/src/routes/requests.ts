import { Hono } from "hono";
import type { IntakeRequest } from "@unsyphn/shared";

const REQUESTS_SEED: IntakeRequest[] = [
  {
    id: "req_001",
    vendorName: "Linear",
    requesterEmail: "eng@acme.dev",
    expectedSpendUsd: 18000,
    justification: "Project tracking for engineering team — Jira is too heavyweight",
    status: "pending",
    similarTools: ["Jira", "Asana", "Monday.com"],
    createdAt: "2026-05-20T09:30:00Z",
  },
  {
    id: "req_002",
    vendorName: "Loom",
    requesterEmail: "design@acme.dev",
    expectedSpendUsd: 6000,
    justification: "Async video messaging for design reviews and demos",
    status: "approved",
    similarTools: ["Zoom", "Slack Clips"],
    createdAt: "2026-05-15T11:00:00Z",
  },
  {
    id: "req_003",
    vendorName: "Miro",
    requesterEmail: "pm@acme.dev",
    expectedSpendUsd: 12000,
    justification: "Collaborative whiteboarding for product planning sessions",
    status: "rejected",
    similarTools: ["FigJam", "Lucidchart", "Mural"],
    createdAt: "2026-05-10T14:00:00Z",
  },
  {
    id: "req_004",
    vendorName: "Retool",
    requesterEmail: "ops@acme.dev",
    expectedSpendUsd: 36000,
    justification: "Internal tooling platform to replace custom admin dashboards",
    status: "pending",
    similarTools: ["Airplane", "Internal.io"],
    createdAt: "2026-05-22T16:45:00Z",
  },
];

export const requestsRoute = new Hono();

requestsRoute.get("/", (c) => {
  const status = c.req.query("status") ?? "all";
  const requests = status === "all"
    ? REQUESTS_SEED
    : REQUESTS_SEED.filter((r) => r.status === status);
  return c.json({ requests });
});
