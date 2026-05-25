// Reports — deterministic seed list with on-demand generation. Mirrors
// apps/api/src/routes/reports.ts shape. The HTML bundle endpoint returns a
// minimal placeholder so the "view bundle" link still opens to a real page.

import { register } from "../router.js";
import { store } from "../store.js";
import {
  notFound,
  nowIso,
  ok,
  type MockRequest,
  type MockResponse,
} from "../types.js";

type ReportSchedule = "monthly" | "weekly" | "quarterly" | "on-demand";
type ReportCategory = "risk" | "compliance" | "spend" | "operational";

interface SeedReport {
  id: string;
  name: string;
  description: string;
  schedule: ReportSchedule;
  category: ReportCategory;
  lastGeneratedAt?: string;
  nextRunAt?: string;
  isCompliancePack: boolean;
}

interface Report {
  id: string;
  name: string;
  description: string;
  schedule: ReportSchedule;
  category: ReportCategory;
  lastGeneratedAt?: string;
  nextRunAt?: string;
  isCompliancePack: boolean;
  downloadUrl?: string;
}

const DAY_MS = 86_400_000;

function seedReports(now: Date): SeedReport[] {
  const daysAgo = (n: number) => new Date(now.getTime() - n * DAY_MS).toISOString();
  const daysAhead = (n: number) => new Date(now.getTime() + n * DAY_MS).toISOString();
  return [
    {
      id: "rpt_monthly_vendor_risk",
      name: "Monthly Vendor Risk Report",
      description: "P1/P2 change counts by month with vendor heatmap.",
      schedule: "monthly",
      category: "risk",
      lastGeneratedAt: daysAgo(8),
      nextRunAt: daysAhead(22),
      isCompliancePack: false,
    },
    {
      id: "rpt_soc2_compliance_pack",
      name: "SOC 2 Compliance Pack",
      description: "Auditor-ready evidence bundle for SOC 2 Type II review.",
      schedule: "on-demand",
      category: "compliance",
      isCompliancePack: true,
    },
    {
      id: "rpt_renewal_forecast",
      name: "Renewal Forecast Report",
      description: "Renewals next 90 days with risk flags and benchmark deltas.",
      schedule: "weekly",
      category: "operational",
      lastGeneratedAt: daysAgo(3),
      nextRunAt: daysAhead(4),
      isCompliancePack: false,
    },
    {
      id: "rpt_recoverable_spend",
      name: "Recoverable Spend Report",
      description:
        "Unused seats, price hikes, and duplicate-app waste with per-vendor breakdown.",
      schedule: "monthly",
      category: "spend",
      lastGeneratedAt: daysAgo(12),
      nextRunAt: daysAhead(18),
      isCompliancePack: false,
    },
    {
      id: "rpt_subprocessor_diff",
      name: "Sub-processor Diff Report",
      description:
        "New and removed sub-processors per vendor with jurisdiction flags.",
      schedule: "quarterly",
      category: "compliance",
      lastGeneratedAt: daysAgo(42),
      nextRunAt: daysAhead(48),
      isCompliancePack: false,
    },
  ];
}

function toReport(seed: SeedReport): Report {
  const override = store.reportGenerationOverrides.get(seed.id);
  const lastGenerated = override?.lastGeneratedAt ?? seed.lastGeneratedAt;
  const out: Report = {
    id: seed.id,
    name: seed.name,
    description: seed.description,
    schedule: seed.schedule,
    category: seed.category,
    isCompliancePack: seed.isCompliancePack,
  };
  if (lastGenerated !== undefined) out.lastGeneratedAt = lastGenerated;
  if (seed.nextRunAt !== undefined) out.nextRunAt = seed.nextRunAt;
  const url =
    override?.downloadUrl ??
    (lastGenerated ? `/v1/reports/${seed.id}/bundle.html` : undefined);
  if (url !== undefined) out.downloadUrl = url;
  return out;
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function listReports(): MockResponse {
  const now = new Date();
  return ok({ reports: seedReports(now).map(toReport) });
}

function getReport(_req: MockRequest, id: string): MockResponse {
  const now = new Date();
  const seed = seedReports(now).find((r) => r.id === id);
  if (!seed) return notFound(`Report ${id} not found`);
  return ok(toReport(seed));
}

function generateReport(_req: MockRequest, id: string): MockResponse {
  const now = new Date();
  const seed = seedReports(now).find((r) => r.id === id);
  if (!seed) return notFound(`Report ${id} not found`);
  const ts = now.toISOString();
  store.reportGenerationOverrides.set(id, {
    lastGeneratedAt: ts,
    downloadUrl: `/v1/reports/${id}/bundle.html?gen=${encodeURIComponent(ts)}`,
  });
  return ok(toReport(seed));
}

function bundleHtml(_req: MockRequest, id: string): MockResponse {
  const now = new Date();
  const seed = seedReports(now).find((r) => r.id === id);
  if (!seed) return notFound(`Report ${id} not found`);
  const generatedAt =
    store.reportGenerationOverrides.get(id)?.lastGeneratedAt ?? nowIso();
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escHtml(seed.name)}</title>
<style>
  body { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; max-width: 820px; margin: 0 auto; padding: 48px 32px; color: #111; }
  .mark { font-size: 9pt; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #444; }
  h1 { font-size: 22pt; margin: 8px 0 4px; letter-spacing: -0.02em; }
  .meta { font-size: 9pt; color: #555; }
  .desc { font-size: 11pt; margin: 24px 0; }
  .footer { margin-top: 48px; padding-top: 12px; border-top: 1px solid #ccc; font-size: 8pt; color: #666; text-align: center; }
  .badge { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 9pt; font-weight: 700; background: #f1f5f9; color: #0f172a; }
</style>
</head>
<body>
  <p class="mark">UNSYPHN REPORT BUNDLE</p>
  <h1>${escHtml(seed.name)}</h1>
  <p class="meta">Report ID: ${escHtml(seed.id)} &middot; Generated: ${escHtml(generatedAt)}</p>
  <p><span class="badge">${escHtml(seed.category)}</span> <span class="badge">${escHtml(seed.schedule)}</span></p>
  <p class="desc">${escHtml(seed.description)}</p>
  <div class="footer">Generated by Unsyphn at ${escHtml(generatedAt)}.</div>
</body>
</html>`;
  const bytes = new TextEncoder().encode(html);
  return {
    status: 200,
    body: null,
    binary: bytes,
    contentType: "text/html; charset=utf-8",
  };
}

export function registerReportHandlers(): void {
  register("GET", /^\/v1\/reports$/, listReports);
  register("GET", /^\/v1\/reports\/([^/]+)\/bundle\.html$/, (req, p) =>
    bundleHtml(req, p[0] ?? ""),
  );
  register("GET", /^\/v1\/reports\/([^/]+)$/, (req, p) =>
    getReport(req, p[0] ?? ""),
  );
  register("POST", /^\/v1\/reports\/([^/]+)\/generate$/, (req, p) =>
    generateReport(req, p[0] ?? ""),
  );
}
