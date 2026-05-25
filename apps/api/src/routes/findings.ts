import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Hono } from "hono";
import { z } from "zod";
import type { Lens, Severity, Vendor } from "@unsyphn/shared";
import { ApiError } from "../lib/errors.js";
import { ErrorCodes } from "@unsyphn/shared";
import { vendorStore } from "../db/vendor-store.js";
import { getSeededChangeReports } from "../seed/loader.js";
import { readLensTags } from "../lib/change-report-views.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export type FindingType = "change" | "compliance" | "subprocessor" | "spend" | "security";
export type FindingState = "open" | "under-review" | "resolved";

export interface Finding {
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

// State overrides live in-memory because findings are derived per-request.
// Mutations write here; aggregation reads here last.
const stateOverrides = new Map<string, FindingState>();

// --- Sub-processor seed loader ----------------------------------------------

interface SubProcessor {
  name: string;
  jurisdiction: string;
  purpose: string;
  adequate: boolean;
  addedAt: string;
  flagged?: boolean;
  flagReason?: string;
}

interface VendorSeedEntry {
  vendorName: string;
  subProcessors: SubProcessor[];
  lastChangeAt: string;
}

type SubProcessorSeed = Record<string, VendorSeedEntry>;

function loadSubProcessorSeed(): SubProcessorSeed {
  const path = resolve(__dirname, "../seed/sub-processors.json");
  return JSON.parse(readFileSync(path, "utf8")) as SubProcessorSeed;
}

// --- Synthetic helpers ------------------------------------------------------

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

const SOC2_BASE_DATE = Date.parse("2026-07-01T00:00:00Z");

function syntheticSoc2Expiry(vendorId: string): string {
  // Deterministic 0-179 day offset from a fixed base so the date never drifts.
  const offsetDays = hashString(vendorId) % 180;
  return new Date(SOC2_BASE_DATE + offsetDays * 86_400_000).toISOString();
}

function daysBetween(later: string, now: Date): number {
  return Math.round((Date.parse(later) - now.getTime()) / 86_400_000);
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// --- Aggregation ------------------------------------------------------------

function fromChangeReports(orgId: string): Finding[] {
  return getSeededChangeReports()
    .filter((r) => r.orgId === orgId && r.state !== "resolved")
    .map<Finding>((r) => {
      const vendor = vendorStore.get(r.vendorId);
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
  const seed = loadSubProcessorSeed();
  const findings: Finding[] = [];
  for (const [vendorId, entry] of Object.entries(seed)) {
    const vendor = vendorStore.get(vendorId);
    if (!vendor || vendor.orgId !== orgId) continue;
    for (const sp of entry.subProcessors) {
      if (sp.flagged !== true) continue;
      findings.push({
        id: `find_sp_${vendorId}_${slugify(sp.name)}`,
        type: "subprocessor",
        severity: "P2",
        title: `New sub-processor ${sp.name} in ${sp.jurisdiction}`,
        summary: sp.flagReason ?? `${sp.name} processes ${sp.purpose} from ${sp.jurisdiction}, a non-adequate jurisdiction.`,
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
  return vendorStore
    .list(orgId)
    .filter(isComplianceCandidate)
    .map<Finding>((v) => {
      const expiresAt = syntheticSoc2Expiry(v.id);
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
        state: "open",
        sourceUrl: `/app/vendors/${encodeURIComponent(v.id)}`,
        lensTags: ["audit", "security", "legal"],
      };
    });
}

function fromSpend(orgId: string, now: Date): Finding[] {
  return vendorStore
    .list(orgId)
    .filter((v) => (v.contract?.annualSpendUsd ?? 0) > 100_000 && v.posture === "watch")
    .map<Finding>((v) => ({
      id: `find_spend_${v.id}`,
      type: "spend",
      severity: "P2",
      title: `Above benchmark — renegotiation candidate`,
      summary: `${v.name} spend of $${Math.round((v.contract?.annualSpendUsd ?? 0) / 1000)}k is above peer median. Open renegotiation talks before renewal.`,
      vendorId: v.id,
      vendorName: v.name,
      detectedAt: now.toISOString(),
      state: "open",
      sourceUrl: `/app/vendors/${encodeURIComponent(v.id)}`,
      lensTags: ["finance", "procurement"],
    }));
}

function applyOverrides(findings: Finding[]): Finding[] {
  return findings.map((f) => {
    const override = stateOverrides.get(f.id);
    return override ? { ...f, state: override } : f;
  });
}

// --- Route ------------------------------------------------------------------

const QuerySchema = z.object({
  type: z.enum(["change", "compliance", "subprocessor", "spend", "security"]).optional(),
  severity: z.enum(["P1", "P2", "P3"]).optional(),
  state: z.enum(["open", "under-review", "resolved"]).optional(),
  lens: z.enum(["procurement", "legal", "security", "finance", "it", "audit"]).optional(),
  vendorId: z.string().optional(),
});

const StateBodySchema = z.object({
  state: z.enum(["open", "under-review", "resolved"]),
});

export const findingsRoute = new Hono();

findingsRoute.get("/", (c) => {
  const orgId = c.get("orgId");
  const parsed = QuerySchema.safeParse({
    type: c.req.query("type"),
    severity: c.req.query("severity"),
    state: c.req.query("state"),
    lens: c.req.query("lens"),
    vendorId: c.req.query("vendorId"),
  });
  if (!parsed.success) {
    throw new ApiError(ErrorCodes.ValidationFailed, "Invalid query parameter", {
      issues: parsed.error.issues,
    });
  }
  const q = parsed.data;
  const now = new Date();

  let findings: Finding[] = [
    ...fromChangeReports(orgId),
    ...fromSubProcessors(orgId),
    ...fromCompliance(orgId, now),
    ...fromSpend(orgId, now),
  ];

  findings = applyOverrides(findings);

  if (q.vendorId) findings = findings.filter((f) => f.vendorId === q.vendorId);
  if (q.type) findings = findings.filter((f) => f.type === q.type);
  if (q.severity) findings = findings.filter((f) => f.severity === q.severity);
  if (q.state) findings = findings.filter((f) => f.state === q.state);
  if (q.lens) findings = findings.filter((f) => f.lensTags.includes(q.lens as Lens));

  findings.sort((a, b) => b.detectedAt.localeCompare(a.detectedAt));

  return c.json({ findings });
});

findingsRoute.post("/:id/state", async (c) => {
  const id = c.req.param("id");
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    throw new ApiError(ErrorCodes.ValidationFailed, "Body must be JSON");
  }
  const parsed = StateBodySchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(ErrorCodes.ValidationFailed, "Invalid state", {
      issues: parsed.error.issues,
    });
  }
  stateOverrides.set(id, parsed.data.state);
  return c.json({ id, state: parsed.data.state });
});

// Test-only — keeps unit suites isolated.
export function _resetFindingState(): void {
  stateOverrides.clear();
}
