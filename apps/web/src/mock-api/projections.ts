// Mirrors apps/api/src/lib/change-report-views.ts. Replicated here so the mock
// builds the same envelopes the real backend returns. Keeping this aligned with
// the API is critical — the frontend caches assume both surfaces match.

import type { ChangeReport, InboxItem, Lens } from "@unsyphn/shared";
import { store, userEmail, vendorName } from "./store.js";

const VALID_LENSES: ReadonlyArray<Lens> = [
  "procurement",
  "legal",
  "security",
  "finance",
  "it",
  "audit",
];

interface ChangeReportWithLensTags extends ChangeReport {
  lensTags?: Lens[];
}

export function readLensTags(report: ChangeReport): Lens[] {
  const candidate = (report as ChangeReportWithLensTags).lensTags;
  if (!Array.isArray(candidate)) return [];
  return candidate.filter((t): t is Lens =>
    (VALID_LENSES as ReadonlyArray<string>).includes(t),
  );
}

function headline(report: ChangeReport): string {
  if (report.headline && report.headline.trim().length > 0) return report.headline;
  return report.changes[0]?.summary ?? "Change detected";
}

function dollarImpact(report: ChangeReport): number | null {
  for (const ch of report.changes) {
    if (ch.dollarImpact?.annualUsd != null) return ch.dollarImpact.annualUsd;
  }
  return null;
}

export function toInboxItem(report: ChangeReport): InboxItem {
  return {
    id: report.id,
    kind: "change",
    vendorId: report.vendorId,
    vendorName: vendorName(report.vendorId),
    title: headline(report),
    summary: report.recommendation.copy,
    severity: report.severity,
    dollarImpact: dollarImpact(report),
    ownerEmail: userEmail(report.ownerId),
    occurredAt: report.detectedAt,
    lensTags: readLensTags(report),
    state: report.state,
  };
}

export interface FeedChange {
  id: string;
  kind: "change";
  vendorId: string;
  vendorName: string;
  title: string;
  summary: string;
  severity: ChangeReport["severity"];
  dollarImpact: number | null;
  ownerEmail: string;
  occurredAt: string;
  category: string | null;
  lensTags: Lens[];
  diff: { before: string; after: string } | null;
  citations: Array<{ url?: string; quote?: string; fetchedAt?: string }>;
}

export function toFeedChange(report: ChangeReport): FeedChange {
  const first = report.changes[0];
  const diff =
    first && (first.before != null || first.after != null)
      ? { before: first.before ?? "", after: first.after ?? "" }
      : null;
  const citations = (first?.citations ?? []).map((c) => ({
    ...(c.url !== undefined ? { url: c.url } : {}),
    ...(c.quote !== undefined ? { quote: c.quote } : {}),
    ...(c.fetchedAt !== undefined ? { fetchedAt: c.fetchedAt } : {}),
  }));
  return {
    id: report.id,
    kind: "change",
    vendorId: report.vendorId,
    vendorName: vendorName(report.vendorId),
    title: headline(report),
    summary: report.recommendation.copy,
    severity: report.severity,
    dollarImpact: dollarImpact(report),
    ownerEmail: userEmail(report.ownerId),
    occurredAt: report.detectedAt,
    category: first?.category ?? null,
    lensTags: readLensTags(report),
    diff,
    citations,
  };
}

export function changeReportsForOrg(orgId: string): ChangeReport[] {
  return [...store.changeReports.values()].filter((r) => r.orgId === orgId);
}
