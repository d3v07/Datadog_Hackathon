import { Hono } from "hono";
import { z } from "zod";
import type { DiscoveryJob } from "@unsyphn/shared";
import { errorResponse } from "../errors.js";

const discoverBodySchema = z.object({
  provider: z.enum(["google", "microsoft"]),
  domain: z.string().min(1),
});

const EXISTING_VENDORS = [
  { id: "vnd_notion", name: "Notion", domain: "notion.so", category: "productivity", spendUsd: 36000, confidence: 1.0 },
  { id: "vnd_stripe", name: "Stripe", domain: "stripe.com", category: "billing", spendUsd: 120000, confidence: 1.0 },
  { id: "vnd_figma", name: "Figma", domain: "figma.com", category: "design", spendUsd: 48000, confidence: 1.0 },
  { id: "vnd_slack", name: "Slack", domain: "slack.com", category: "productivity", spendUsd: 180000, confidence: 1.0 },
  { id: "vnd_datadog", name: "Datadog", domain: "datadoghq.com", category: "productivity", spendUsd: 240000, confidence: 1.0 },
  { id: "vnd_salesforce", name: "Salesforce", domain: "salesforce.com", category: "productivity", spendUsd: 815000, confidence: 1.0 },
  { id: "vnd_github", name: "GitHub", domain: "github.com", category: "productivity", spendUsd: 72000, confidence: 1.0 },
  { id: "vnd_aws", name: "AWS", domain: "aws.amazon.com", category: "productivity", spendUsd: 980000, confidence: 1.0 },
];

const NEW_VENDOR_NAMES = [
  "HubSpot", "Asana", "Linear", "Jira", "Confluence",
  "Zoom", "Adobe Creative Cloud", "Microsoft 365", "Google Workspace",
  "Okta", "Vanta", "Brex",
];

const VENDOR_CATEGORIES: Record<string, string> = {
  HubSpot: "productivity",
  Asana: "productivity",
  Linear: "productivity",
  Jira: "productivity",
  Confluence: "productivity",
  Zoom: "productivity",
  "Adobe Creative Cloud": "design",
  "Microsoft 365": "productivity",
  "Google Workspace": "productivity",
  Okta: "identity",
  Vanta: "security",
  Brex: "billing",
};

const VENDOR_DOMAINS: Record<string, string> = {
  HubSpot: "hubspot.com",
  Asana: "asana.com",
  Linear: "linear.app",
  Jira: "atlassian.com",
  Confluence: "atlassian.com",
  Zoom: "zoom.us",
  "Adobe Creative Cloud": "adobe.com",
  "Microsoft 365": "microsoft.com",
  "Google Workspace": "workspace.google.com",
  Okta: "okta.com",
  Vanta: "vanta.com",
  Brex: "brex.com",
};

const SPEND_SEEDS: Record<string, number> = {
  HubSpot: 42000,
  Asana: 18000,
  Linear: 12000,
  Jira: 36000,
  Confluence: 24000,
  Zoom: 30000,
  "Adobe Creative Cloud": 48000,
  "Microsoft 365": 120000,
  "Google Workspace": 96000,
  Okta: 60000,
  Vanta: 45000,
  Brex: 9000,
};

const NEW_DISCOVERED = NEW_VENDOR_NAMES.map((name) => ({
  id: `vnd_${name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`,
  name,
  domain: VENDOR_DOMAINS[name] ?? `${name.toLowerCase().replace(/\s+/g, "")}.com`,
  category: VENDOR_CATEGORIES[name] ?? "productivity",
  spendUsd: SPEND_SEEDS[name] ?? 20000,
  confidence: 0.95,
}));

const STUB_JOB: DiscoveryJob = {
  jobId: "job_demo_001",
  estimatedSeconds: 45,
  expectedVendors: 247,
  discoveredVendors: [...EXISTING_VENDORS, ...NEW_DISCOVERED],
};

export const onboardingRoute = new Hono();

onboardingRoute.post("/discover", async (c) => {
  let rawBody: unknown;
  try {
    rawBody = await c.req.json();
  } catch {
    return errorResponse(c, 422, "unprocessable", "Request body must be valid JSON");
  }

  const parsed = discoverBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return errorResponse(c, 422, "unprocessable", "Invalid request body", parsed.error.flatten());
  }

  return c.json(STUB_JOB);
});
