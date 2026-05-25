// Aggregated findings — derived from non-resolved change reports, flagged
// sub-processors, and synthetic SOC2/spend signals per vendor. State overrides
// live in store.findingStateOverrides so toggle actions persist for the session.

import type { Lens, Severity, Vendor } from "@unsyphn/shared";
import { changeReportsForOrg, readLensTags } from "../projections.js";
import { register } from "../router.js";
import { store } from "../store.js";
import {
  badRequest,
  ok,
  type MockRequest,
  type MockResponse,
} from "../types.js";

type FindingType = "change" | "compliance" | "subprocessor" | "spend" | "security";
type FindingState = "open" | "under-review" | "resolved";

interface Finding {
  id: string;
  type: FindingType;
  severity: Severity;
  title: string;
  summary: string;
  vendorId: string;
  vendorName: string;
  detectedAt: string;
  state: FindingState;
  ownerId?: string;
  sourceUrl?: string;
  lensTags: Lens[];
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

const SOC2_BASE_DATE = Date.parse("2026-07-01T00:00:00Z");

function soc2Expiry(vendorId: string): string {
  const offsetDays = hashString(vendorId) % 180;
  return new Date(SOC2_BASE_DATE + offsetDays * 86_400_000).toISOString();
}

function daysBetween(later: string, now: Date): number {
  return Math.round((Date.parse(later) - now.getTime()) / 86_400_000);
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function fromChangeReports(orgId: string): Finding[] {
  return changeReportsForOrg(orgId)
    .filter((r) => r.state !== "resolved")
    .map((r) => {
      const vendor = store.vendors.get(r.vendorId);
      const title = r.headline ?? r.changes[0]?.summary ?? "Material change detected";
      const finding: Finding = {
        id: `find_chg_${r.id}`,
        type: "change",
        severity: r.severity,
        title,
        summary: r.recommendation.copy,
        vendorId: r.vendorId,
        vendorName: vendor?.name ?? r.vendorId,
        detectedAt: r.detectedAt,
        state: r.state === "new" ? "open" : "under-review",
        sourceUrl: `/app/change/${encodeURIComponent(r.id)}`,
        lensTags: readLensTags(r),
      };
      if (r.ownerId) finding.ownerId = r.ownerId;
      return finding;
    });
}

function fromSubProcessors(orgId: string): Finding[] {
  const findings: Finding[] = [];
  for (const [vendorId, entry] of store.subProcessors.entries()) {
    const vendor = store.vendors.get(vendorId);
    if (!vendor || vendor.orgId !== orgId) continue;
    for (const sp of entry.subProcessors) {
      if (sp.flagged !== true) continue;
      findings.push({
        id: `find_sp_${vendorId}_${slugify(sp.name)}`,
        type: "subprocessor",
        severity: "P2",
        title: `New sub-processor ${sp.name} in ${sp.jurisdiction}`,
        summary:
          sp.flagReason ??
          `${sp.name} processes ${sp.purpose} from ${sp.jurisdiction}, a non-adequate jurisdiction.`,
        vendorId,
        vendorName: entry.vendorName,
        detectedAt: sp.addedAt,
        state: "open",
        sourceUrl: `/app/vendors/${encodeURIComponent(vendorId)}?tab=subprocessors`,
        lensTags: ["security", "legal"],
      });
    }
  }
  return findings;
}

function isComplianceCandidate(v: Vendor): boolean {
  if (v.category === "security" || v.category === "infrastructure") return true;
  return (v.dataClasses ?? []).includes("pii");
}

function fromCompliance(orgId: string, now: Date): Finding[] {
  return [...store.vendors.values()]
    .filter((v) => v.orgId === orgId && isComplianceCandidate(v))
    .map((v) => {
      const expiresAt = soc2Expiry(v.id);
      const days = daysBetween(expiresAt, now);
      const severity: Severity = days < 30 ? "P1" : days < 90 ? "P2" : "P3";
      return {
        id: `find_compl_${v.id}`,
        type: "compliance",
        severity,
        title: `SOC 2 Type II expires in ${days} day${days === 1 ? "" : "s"}`,
        summary: `${v.name}'s SOC 2 attestation expires ${new Date(expiresAt).toISOString().slice(0, 10)}. Request a renewed report before the audit window closes.`,
        vendorId: v.id,
        vendorName: v.name,
        detectedAt: now.toISOString(),
        state: "open" as FindingState,
        sourceUrl: `/app/vendors/${encodeURIComponent(v.id)}`,
        lensTags: ["audit", "security", "legal"] as Lens[],
      };
    });
}

function fromSpend(orgId: string, now: Date): Finding[] {
  return [...store.vendors.values()]
    .filter(
      (v) =>
        v.orgId === orgId &&
        (v.contract?.annualSpendUsd ?? 0) > 100_000 &&
        v.posture === "watch",
    )
    .map((v) => ({
      id: `find_spend_${v.id}`,
      type: "spend" as FindingType,
      severity: "P2" as Severity,
      title: "Above benchmark — renegotiation candidate",
      summary: `${v.name} spend of $${Math.round((v.contract?.annualSpendUsd ?? 0) / 1000)}k is above peer median. Open renegotiation talks before renewal.`,
      vendorId: v.id,
      vendorName: v.name,
      detectedAt: now.toISOString(),
      state: "open" as FindingState,
      sourceUrl: `/app/vendors/${encodeURIComponent(v.id)}`,
      lensTags: ["finance", "procurement"] as Lens[],
    }));
}

function applyOverrides(findings: Finding[]): Finding[] {
  return findings.map((f) => {
    const override = store.findingStateOverrides.get(f.id);
    return override ? { ...f, state: override } : f;
  });
}

function listFindings(req: MockRequest): MockResponse {
  const orgId = req.orgId ?? "org_acme";
  const now = new Date();
  let findings: Finding[] = [
    ...fromChangeReports(orgId),
    ...fromSubProcessors(orgId),
    ...fromCompliance(orgId, now),
    ...fromSpend(orgId, now),
  ];
  findings = applyOverrides(findings);

  const vendorId = req.query.get("vendorId");
  const type = req.query.get("type");
  const severity = req.query.get("severity");
  const state = req.query.get("state");
  const lens = req.query.get("lens");

  if (vendorId) findings = findings.filter((f) => f.vendorId === vendorId);
  if (type) findings = findings.filter((f) => f.type === (type as FindingType));
  if (severity) findings = findings.filter((f) => f.severity === (severity as Severity));
  if (state) findings = findings.filter((f) => f.state === (state as FindingState));
  if (lens) findings = findings.filter((f) => f.lensTags.includes(lens as Lens));

  findings.sort((a, b) => b.detectedAt.localeCompare(a.detectedAt));
  return ok({ findings });
}

function patchFindingState(req: MockRequest, id: string): MockResponse {
  const body = (req.body ?? {}) as { state?: FindingState };
  if (
    !body.state ||
    (body.state !== "open" && body.state !== "under-review" && body.state !== "resolved")
  ) {
    return badRequest("state must be open | under-review | resolved");
  }
  store.findingStateOverrides.set(id, body.state);
  return ok({ id, state: body.state });
}

export function registerFindingHandlers(): void {
  register("GET", /^\/v1\/findings$/, listFindings);
  register("POST", /^\/v1\/findings\/([^/]+)\/state$/, (req, p) =>
    patchFindingState(req, p[0] ?? ""),
  );
}
