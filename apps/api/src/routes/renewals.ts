import { Hono } from "hono";
import type { Renewal } from "@unsyphn/shared";

const RENEWALS_SEED: Renewal[] = [
  {
    id: "ren_001",
    vendorId: "vnd_salesforce",
    vendorName: "Salesforce",
    renewsAt: "2026-07-10",
    daysOut: 47,
    annualValueUsd: 815000,
    ownerEmail: "marcus@acme.dev",
    status: "negotiate",
    benchmarkDelta: -12,
  },
  {
    id: "ren_002",
    vendorId: "vnd_slack",
    vendorName: "Slack",
    renewsAt: "2026-06-16",
    daysOut: 23,
    annualValueUsd: 180000,
    ownerEmail: "it@acme.dev",
    status: "triage",
    benchmarkDelta: 5,
  },
  {
    id: "ren_003",
    vendorId: "vnd_datadog",
    vendorName: "Datadog",
    renewsAt: "2026-08-04",
    daysOut: 72,
    annualValueUsd: 240000,
    ownerEmail: "it@acme.dev",
    status: "triage",
    benchmarkDelta: 12,
  },
  {
    id: "ren_004",
    vendorId: "vnd_figma",
    vendorName: "Figma",
    renewsAt: "2026-06-28",
    daysOut: 35,
    annualValueUsd: 48000,
    ownerEmail: "alex@acme.dev",
    status: "negotiate",
    benchmarkDelta: -3,
  },
  {
    id: "ren_005",
    vendorId: "vnd_github",
    vendorName: "GitHub",
    renewsAt: "2026-07-20",
    daysOut: 57,
    annualValueUsd: 72000,
    ownerEmail: "it@acme.dev",
    status: "triage",
    benchmarkDelta: null,
  },
  {
    id: "ren_006",
    vendorId: "vnd_notion",
    vendorName: "Notion",
    renewsAt: "2026-06-10",
    daysOut: 17,
    annualValueUsd: 36000,
    ownerEmail: "priya@acme.dev",
    status: "sign",
    benchmarkDelta: -8,
  },
  {
    id: "ren_007",
    vendorId: "vnd_stripe",
    vendorName: "Stripe",
    renewsAt: "2026-08-12",
    daysOut: 80,
    annualValueUsd: 120000,
    ownerEmail: "finance@acme.dev",
    status: "triage",
    benchmarkDelta: null,
  },
  {
    id: "ren_008",
    vendorId: "vnd_aws",
    vendorName: "AWS",
    renewsAt: "2026-07-01",
    daysOut: 38,
    annualValueUsd: 980000,
    ownerEmail: "cto@acme.dev",
    status: "negotiate",
    benchmarkDelta: 18,
  },
];

export const renewalsRoute = new Hono();

renewalsRoute.get("/", (c) => {
  const days = Number(c.req.query("days") ?? 90);
  const renewals = RENEWALS_SEED.filter((r) => r.daysOut <= days);
  return c.json({ renewals });
});
