import type { ChangeReport, InboxItem, Lens } from "@unsyphn/shared";
import { vendorStore } from "../db/vendor-store.js";
import { getUser } from "../seed/loader.js";

// ChangeReport carries the canonical record (used by lifecycle mutations and
// evidence brief). Two surfaces consume it in derived shapes:
//   1. Inbox cards (vendor name, owner email, dollar impact, headline)
//   2. Vendor-detail / renewals feed (raw diff + citations for DiffViewer)
// These mappers project a ChangeReport into those shapes so the data stays
// consistent and seed expansion in seed/change-reports.json benefits every
// surface at once.

const VALID_LENSES: ReadonlyArray<Lens> = [
  "procurement",
  "legal",
  "security",
  "finance",
  "it",
  "audit",
];

type ChangeReportWithLensTags = ChangeReport & { lensTags?: Lens[] };

export function readLensTags(report: ChangeReport): Lens[] {
  const candidate = (report as ChangeReportWithLensTags).lensTags;
  if (!Array.isArray(candidate)) return [];
  return candidate.filter((t): t is Lens => (VALID_LENSES as ReadonlyArray<string>).includes(t));
}

function vendorName(report: ChangeReport): string {
  return vendorStore.get(report.vendorId)?.name ?? report.vendorId.replace(/^vnd_/, "");
}

function ownerEmail(report: ChangeReport): string {
  return getUser(report.ownerId)?.email ?? `${report.ownerId}@acme.dev`;
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
    vendorName: vendorName(report),
    title: headline(report),
    summary: report.recommendation.copy,
    severity: report.severity,
    dollarImpact: dollarImpact(report),
    ownerEmail: ownerEmail(report),
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
    vendorName: vendorName(report),
    title: headline(report),
    summary: report.recommendation.copy,
    severity: report.severity,
    dollarImpact: dollarImpact(report),
    ownerEmail: ownerEmail(report),
    occurredAt: report.detectedAt,
    category: first?.category ?? null,
    lensTags: readLensTags(report),
    diff,
    citations,
  };
}
