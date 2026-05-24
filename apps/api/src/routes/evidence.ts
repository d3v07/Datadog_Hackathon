import { Hono } from "hono";
import type { Change, Citation, EvidenceBriefResponse } from "@redline/shared";
import { ErrorCodes } from "@redline/shared";
import { ApiError } from "../lib/errors.js";
import type { ChangeReportRepository } from "../db/changeReports.js";
import { policyStore } from "../db/policy-store.js";
import { vendorStore } from "../db/vendor-store.js";
import { newId } from "../lib/ids.js";

// Public evidence brief fallback. The API is /v1/evidence/:id so it does not
// collide with the SPA /evidence/:id history route.

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtTs(iso: string): string {
  try { return new Date(iso).toUTCString(); } catch { return iso; }
}

function fmtDollar(value: number): string {
  const abs = Math.abs(value);
  const sign = value >= 0 ? "+" : "−";
  return `${sign}$${abs.toLocaleString("en-US")}`;
}

function renderCitation(c: Citation): string {
  const quote = escHtml(c.quote ?? "");
  const section = c.section ? `<span>${escHtml(c.section)} · </span>` : "";
  const url = c.url
    ? `<a href="${escHtml(c.url)}">${escHtml(c.url)}</a>`
    : "";
  const fetched = c.fetchedAt
    ? `<span> · Fetched ${escHtml(fmtTs(c.fetchedAt))}</span>`
    : "";
  const country = c.country ? `<span> · ${escHtml(c.country)}</span>` : "";
  return `<li class="citation">
    <p class="citation-quote">"${quote}"</p>
    <p class="citation-meta">${section}${url}${fetched}${country}</p>
  </li>`;
}

function renderChange(ch: Change): string {
  const citations = (ch.citations ?? []).map(renderCitation).join("");
  const impact = ch.dollarImpact
    ? `<p class="change-impact">Impact: <strong>${escHtml(fmtDollar(ch.dollarImpact.annualUsd))}/yr</strong>${
        ch.dollarImpact.pctChange !== undefined
          ? ` (${ch.dollarImpact.pctChange > 0 ? "+" : ""}${ch.dollarImpact.pctChange.toFixed(2)}%)`
          : ""
      }</p>`
    : "";
  return `<div class="change">
    <p class="change-cat">${escHtml(ch.category ?? "")} · ${escHtml(ch.materiality ?? "")}</p>
    <h3 class="change-summary">${escHtml(ch.summary ?? "")}</h3>
    <div class="change-diff">
      <div class="change-before"><em>BEFORE</em>${escHtml(ch.before ?? "")}</div>
      <div class="change-after"><em>AFTER</em>${escHtml(ch.after ?? "")}</div>
    </div>
    ${impact}
    <ul class="citations">${citations}</ul>
  </div>`;
}

function renderBundleHtml(brief: EvidenceBriefResponse, bundleId: string, generatedAt: string): string {
  const { changeReport: report, vendor, policyFired, policyAlsoMatched, actionSummary } = brief;
  const changes = report.changes.map(renderChange).join("");
  const alsoMatched = policyAlsoMatched.length > 0
    ? `<p class="also-matched">Also matched: ${policyAlsoMatched.map(p => escHtml(p.name)).join(" · ")}</p>`
    : "";
  const actions = actionSummary.length > 0
    ? actionSummary.map(a =>
        `<tr><td>${escHtml(a.kind)}</td><td>${escHtml(a.target)}</td><td>${escHtml(a.status)}</td><td>${escHtml(fmtTs(a.firedAt))}</td></tr>`
      ).join("")
    : `<tr><td colspan="4" class="empty">No routed actions recorded.</td></tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Redline Evidence Bundle · ${escHtml(report.id)}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; }
  body {
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    font-size: 11pt;
    font-weight: 400;
    color: #111;
    background: #fff;
    margin: 0;
    padding: 0;
    line-height: 1.5;
  }
  .page { max-width: 820px; margin: 0 auto; padding: 48px 32px 80px; }
  .bundle-header {
    border-bottom: 2px solid #111;
    padding-bottom: 16px;
    margin-bottom: 32px;
  }
  .bundle-mark {
    font-size: 9pt;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #444;
  }
  .bundle-title {
    font-size: 22pt;
    font-weight: 700;
    margin: 8px 0 4px;
    letter-spacing: -0.02em;
    line-height: 1.15;
  }
  .bundle-meta {
    font-size: 9pt;
    color: #555;
    margin: 0;
  }
  .section { margin: 28px 0; }
  .section-label {
    font-size: 8pt;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #666;
    margin: 0 0 10px;
    border-bottom: 1px solid #ddd;
    padding-bottom: 4px;
  }
  .severity {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 999px;
    font-size: 9pt;
    font-weight: 700;
    letter-spacing: 0.04em;
    margin-bottom: 10px;
  }
  .severity-P1 { background: #fee2e2; color: #991b1b; }
  .severity-P2 { background: #ffedd5; color: #9a3412; }
  .severity-P3 { background: #dcfce7; color: #166534; }
  .policy-box {
    border: 1px solid #ddd;
    border-radius: 6px;
    padding: 12px 16px;
    background: #f9f9f9;
  }
  .policy-box strong { display: block; font-size: 11pt; margin-bottom: 2px; }
  .policy-box .policy-id { font-size: 8pt; color: #666; }
  .also-matched { margin-top: 8px; font-size: 9pt; color: #555; }
  .change {
    border: 1px solid #ddd;
    border-radius: 6px;
    padding: 14px 16px;
    margin-bottom: 16px;
    page-break-inside: avoid;
  }
  .change-cat {
    font-size: 8pt;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #666;
    margin: 0 0 4px;
  }
  .change-summary {
    font-size: 13pt;
    font-weight: 600;
    margin: 0 0 10px;
  }
  .change-diff {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 10px;
  }
  .change-before, .change-after {
    padding: 8px 10px;
    border-radius: 4px;
    font-size: 9pt;
    background: #f4f4f4;
  }
  .change-before { border-left: 3px solid #d97706; }
  .change-after  { border-left: 3px solid #16a34a; }
  .change-before em, .change-after em {
    display: block;
    font-style: normal;
    font-size: 7.5pt;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #888;
    margin-bottom: 4px;
  }
  .change-impact { font-size: 9pt; color: #555; margin: 6px 0 8px; }
  .change-impact strong { color: #111; }
  .citations { list-style: none; padding: 0; margin: 0; }
  .citation {
    border-left: 2px solid #bbb;
    padding: 6px 12px;
    margin: 6px 0;
    background: #fafafa;
    font-size: 9pt;
    page-break-inside: avoid;
  }
  .citation-quote { font-style: italic; margin: 0 0 4px; }
  .citation-meta { font-size: 8pt; color: #666; margin: 0; }
  .citation-meta a { color: #1d4ed8; text-decoration: none; }
  .actions-table { width: 100%; border-collapse: collapse; font-size: 9pt; }
  .actions-table th {
    text-align: left;
    font-size: 8pt;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    border-bottom: 1px solid #ddd;
    padding: 4px 8px;
    color: #555;
  }
  .actions-table td { padding: 5px 8px; border-bottom: 1px solid #eee; }
  .actions-table tr:last-child td { border-bottom: none; }
  .empty { color: #888; font-style: italic; }
  .bundle-footer {
    margin-top: 48px;
    padding-top: 12px;
    border-top: 1px solid #ccc;
    font-size: 8pt;
    color: #666;
    text-align: center;
  }
  @media print {
    body { font-size: 10pt; }
    .page { padding: 16px; max-width: none; }
    .bundle-header { page-break-after: avoid; }
    .change { page-break-inside: avoid; }
    .citation { page-break-inside: avoid; }
    a[href]::after { content: " (" attr(href) ")"; font-size: 8pt; color: #888; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="bundle-header">
    <p class="bundle-mark">REDLINE EVIDENCE BUNDLE</p>
    <h1 class="bundle-title">${escHtml(vendor.name)} — ${escHtml(report.changes[0]?.summary ?? "Change detected")}</h1>
    <p class="bundle-meta">
      Report ID: ${escHtml(report.id)} &nbsp;·&nbsp;
      Detected: ${escHtml(fmtTs(report.detectedAt))} &nbsp;·&nbsp;
      Bundle generated: ${escHtml(generatedAt)}
    </p>
  </div>

  <div class="section">
    <p class="section-label">Severity &amp; State</p>
    <span class="severity severity-${escHtml(report.severity)}">${escHtml(report.severity)}</span>
    <span style="margin-left:8px;font-size:9pt;color:#555;">${escHtml(report.state)}</span>
  </div>

  <div class="section">
    <p class="section-label">Vendor</p>
    <p><strong>${escHtml(vendor.name)}</strong> · ${escHtml(vendor.category)}</p>
  </div>

  <div class="section">
    <p class="section-label">Policy Fired</p>
    <div class="policy-box">
      <strong>${escHtml(policyFired.name)}</strong>
      <span class="policy-id">${escHtml(policyFired.id)}</span>
      ${alsoMatched}
    </div>
  </div>

  <div class="section">
    <p class="section-label">Recommendation</p>
    <p><strong>${escHtml(report.recommendation?.action ?? "")}</strong> — ${escHtml(report.recommendation?.copy ?? "")}</p>
  </div>

  <div class="section">
    <p class="section-label">Changes (${report.changes.length})</p>
    ${changes}
  </div>

  <div class="section">
    <p class="section-label">Routed Actions</p>
    <table class="actions-table">
      <thead><tr><th>Kind</th><th>Target</th><th>Status</th><th>Fired At</th></tr></thead>
      <tbody>${actions}</tbody>
    </table>
  </div>

  <div class="bundle-footer">
    Generated by Redline at ${escHtml(generatedAt)}.
    This bundle is immutable. Bundle id: ${escHtml(bundleId)}
  </div>
</div>
</body>
</html>`;
}

export function createEvidenceRouter(reports: ChangeReportRepository): Hono {
  const router = new Hono();

  // Must be registered before /:id to avoid Hono matching "bundle.html" as an id.
  router.get("/:id/bundle.html", async (c) => {
    const id = c.req.param("id");
    const report = await reports.findById(id as Parameters<typeof reports.findById>[0]);
    if (!report) {
      throw new ApiError(
        ErrorCodes.NotFound,
        `No evidence brief for id ${id}`,
      );
    }

    const vendor = vendorStore.get(report.vendorId);
    const policyFired = policyStore.get(report.policyFiredId);
    const policyAlsoMatched = report.policyAlsoMatched
      .map((pid) => policyStore.get(pid))
      .filter((p): p is NonNullable<typeof p> => p !== undefined)
      .map((p) => ({ id: p.id, name: p.name }));

    const brief: EvidenceBriefResponse = {
      changeReport: report,
      vendor: {
        id: vendor?.id ?? report.vendorId,
        name: vendor?.name ?? "Unknown vendor",
        category: vendor?.category ?? "uncategorized",
      },
      policyFired: {
        id: policyFired?.id ?? report.policyFiredId,
        name: policyFired?.name ?? "Unknown policy",
      },
      policyAlsoMatched,
      actionSummary: [],
    };

    const bundleId = `bun_${newId("bundle").replace("bnd_", "")}`;
    const generatedAt = new Date().toISOString();
    const html = renderBundleHtml(brief, bundleId, generatedAt);

    return c.html(html);
  });

  router.get("/:id", async (c) => {
    const id = c.req.param("id");
    const report = await reports.findById(id as Parameters<typeof reports.findById>[0]);
    if (!report) {
      throw new ApiError(
        ErrorCodes.NotFound,
        `No evidence brief for id ${id}`,
      );
    }

    const vendor = vendorStore.get(report.vendorId);
    const policyFired = policyStore.get(report.policyFiredId);
    const policyAlsoMatched = report.policyAlsoMatched
      .map((pid) => policyStore.get(pid))
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
        id: policyFired?.id ?? report.policyFiredId,
        name: policyFired?.name ?? "Unknown policy",
      },
      policyAlsoMatched,
      actionSummary: [],
    };

    return c.json(response);
  });

  return router;
}
