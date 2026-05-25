// Misc / catch-all handlers — auditor sessions, recoverable, policies,
// dashboard summary, onboarding discovery, evidence brief, health.

import type { EvidenceBriefResponse } from "@unsyphn/shared";
import { register } from "../router.js";
import { store } from "../store.js";
import {
  newId,
  notFound,
  nowIso,
  ok,
  type MockRequest,
  type MockResponse,
} from "../types.js";

const RECOVERABLE_STUB = {
  totalUsd: 135000,
  breakdown: {
    unusedSeatsUsd: 42000,
    priceHikesUsd: 28000,
    duplicateAppsUsd: 18000,
    atRiskUsd: 47000,
  },
};

function health(): MockResponse {
  return ok({ ok: true });
}

function recoverable(): MockResponse {
  return ok(RECOVERABLE_STUB);
}

function policies(): MockResponse {
  return ok({ policies: [...store.policies.values()] });
}

function dashboard(): MockResponse {
  const vendors = [...store.vendors.values()];
  const openChangeCount = [...store.changeReports.values()].filter(
    (r) => r.state !== "resolved",
  ).length;
  const annualRunRateUsd = vendors.reduce(
    (acc, v) => acc + (v.contract?.annualSpendUsd ?? 0),
    0,
  );
  return ok({
    vendorCount: vendors.length,
    annualRunRateUsd,
    openChangeCount,
  });
}

function onboardingDiscover(_req: MockRequest): MockResponse {
  // Deterministic stub that mirrors apps/api/src/routes/onboarding.ts. The
  // Onboarding screen uses this purely for the count/preview panel.
  const existing = [
    { id: "vnd_notion", name: "Notion", domain: "notion.so", category: "productivity", spendUsd: 36000, confidence: 1 },
    { id: "vnd_stripe", name: "Stripe", domain: "stripe.com", category: "billing", spendUsd: 120000, confidence: 1 },
    { id: "vnd_figma", name: "Figma", domain: "figma.com", category: "design", spendUsd: 48000, confidence: 1 },
    { id: "vnd_slack", name: "Slack", domain: "slack.com", category: "productivity", spendUsd: 180000, confidence: 1 },
    { id: "vnd_datadog", name: "Datadog", domain: "datadoghq.com", category: "productivity", spendUsd: 240000, confidence: 1 },
    { id: "vnd_salesforce", name: "Salesforce", domain: "salesforce.com", category: "productivity", spendUsd: 815000, confidence: 1 },
    { id: "vnd_github", name: "GitHub", domain: "github.com", category: "productivity", spendUsd: 72000, confidence: 1 },
    { id: "vnd_aws", name: "AWS", domain: "aws.amazon.com", category: "productivity", spendUsd: 980000, confidence: 1 },
  ];
  return ok({
    jobId: "job_demo_001",
    estimatedSeconds: 45,
    expectedVendors: 247,
    discoveredVendors: existing,
  });
}

function evidence(_req: MockRequest, id: string): MockResponse {
  const report = store.changeReports.get(id);
  if (!report) return notFound(`No evidence brief for id ${id}`);
  const vendor = store.vendors.get(report.vendorId);
  const policy = store.policies.get(report.policyFiredId);
  const alsoMatched = report.policyAlsoMatched
    .map((pid) => store.policies.get(pid))
    .filter((p): p is NonNullable<typeof p> => p !== undefined)
    .map((p) => ({ id: p.id, name: p.name }));
  const response: EvidenceBriefResponse = {
    changeReport: report,
    vendor: {
      id: vendor?.id ?? report.vendorId,
      name: vendor?.name ?? "Unknown vendor",
      category: vendor?.category ?? "uncategorized",
    },
    policyFired: {
      id: policy?.id ?? report.policyFiredId,
      name: policy?.name ?? "Unknown policy",
    },
    policyAlsoMatched: alsoMatched,
    actionSummary: [],
  };
  return ok(response);
}

function evidenceBundle(_req: MockRequest, id: string): MockResponse {
  const report = store.changeReports.get(id);
  if (!report) return notFound(`No evidence brief for id ${id}`);
  const vendor = store.vendors.get(report.vendorId);
  const policy = store.policies.get(report.policyFiredId);
  const title = report.changes[0]?.summary ?? "Change detected";
  const generatedAt = nowIso();
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Unsyphn Evidence Bundle - ${report.id}</title>
<style>body{font-family:Helvetica,Arial,sans-serif;max-width:820px;margin:0 auto;padding:48px 32px;color:#111}h1{font-size:22pt;margin:8px 0 4px}.mark{font-size:9pt;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#444}.meta{font-size:9pt;color:#555}.box{border:1px solid #ddd;border-radius:6px;padding:12px 16px;background:#f9f9f9;margin:24px 0}</style></head>
<body><p class="mark">UNSYPHN EVIDENCE BUNDLE</p><h1>${vendor?.name ?? "Vendor"} - ${title}</h1>
<p class="meta">Report ID: ${report.id} - Detected: ${report.detectedAt} - Bundle generated: ${generatedAt}</p>
<div class="box"><strong>Policy fired:</strong> ${policy?.name ?? "Unknown policy"}<br><strong>Severity:</strong> ${report.severity}<br><strong>Recommendation:</strong> ${report.recommendation.copy}</div>
<p>This is a demo evidence bundle generated client-side by the mock-API layer. The production system attaches signed citations, diff blobs, and routed action records.</p>
</body></html>`;
  const bytes = new TextEncoder().encode(html);
  return {
    status: 200,
    body: null,
    binary: bytes,
    contentType: "text/html; charset=utf-8",
  };
}

function auditorCreateSession(req: MockRequest): MockResponse {
  const body = (req.body ?? {}) as { vendorIds?: string[]; expiresInDays?: number };
  const expiresInDays = body.expiresInDays ?? 14;
  const expiresAt = Date.now() + expiresInDays * 24 * 60 * 60 * 1000;
  const sessionToken = `mock_${newId("sess")}`;
  return ok({
    sessionToken,
    shareUrl: `${window.location.origin}/auditor/${sessionToken}`,
    expiresAt: new Date(expiresAt).toISOString(),
  });
}

function auditorGetSession(_req: MockRequest, _token: string): MockResponse {
  const orgId = "org_acme";
  const scoped = [...store.vendors.values()].filter((v) => v.orgId === orgId);
  return ok({
    orgId,
    vendorIds: null,
    expiresAt: new Date(Date.now() + 14 * 86_400_000).toISOString(),
    sessionId: "sess_demo",
    vendors: scoped.map((v) => ({
      id: v.id,
      name: v.name,
      ownerEmail: store.users.get(v.ownerId)?.email ?? "owner@acme.dev",
      annualSpendUsd: v.contract?.annualSpendUsd ?? 0,
      changeCount: v.latestChangeId ? 1 : 0,
      posture: v.posture ?? "ok",
    })),
    changes: [],
    activityLog: [],
  });
}

function commentsForChange(_req: MockRequest, _id: string): MockResponse {
  // No comments wired yet — returning an empty list keeps the change drawer
  // tabs working without a 404 toast.
  return ok({ comments: [] });
}

export function registerMiscHandlers(): void {
  register("GET", /^\/v1\/health$/, health);
  register("GET", /^\/v1\/recoverable$/, recoverable);
  register("GET", /^\/v1\/policies$/, policies);
  register("GET", /^\/v1\/dashboard\/summary$/, dashboard);
  register("POST", /^\/v1\/onboarding\/discover$/, onboardingDiscover);
  // Evidence: bundle.html before /:id so the param doesn't swallow it.
  register("GET", /^\/v1\/evidence\/([^/]+)\/bundle\.html$/, (req, p) =>
    evidenceBundle(req, p[0] ?? ""),
  );
  register("GET", /^\/v1\/evidence\/([^/]+)$/, (req, p) =>
    evidence(req, p[0] ?? ""),
  );
  register("POST", /^\/v1\/auditor\/sessions$/, auditorCreateSession);
  register("GET", /^\/v1\/auditor\/sessions\/([^/]+)$/, (req, p) =>
    auditorGetSession(req, p[0] ?? ""),
  );
  register("GET", /^\/v1\/changes\/([^/]+)\/comments$/, (req, p) =>
    commentsForChange(req, p[0] ?? ""),
  );
}
