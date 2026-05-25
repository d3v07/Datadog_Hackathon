// Vendor surface — list, get, patch, contracts (list/upload/download stub),
// activity timeline, scan trigger, renegotiation packet, sub-processors.

import type { Lens, Vendor } from "@unsyphn/shared";
import { changeReportsForOrg, readLensTags, toFeedChange } from "../projections.js";
import { register } from "../router.js";
import {
  store,
  type ContractFileRecord,
  type SubProcessorVendorEntry,
  type VendorEvent,
} from "../store.js";
import {
  badRequest,
  created,
  newId,
  notFound,
  nowIso,
  ok,
  type MockRequest,
  type MockResponse,
} from "../types.js";

const VALID_LENSES = new Set<Lens>([
  "procurement",
  "legal",
  "security",
  "finance",
  "it",
  "audit",
]);

function getOrgVendor(orgId: string, id: string): Vendor | undefined {
  const vendor = store.vendors.get(id);
  if (!vendor || vendor.orgId !== orgId) return undefined;
  return vendor;
}

function listVendors(req: MockRequest): MockResponse {
  const orgId = req.orgId ?? "org_acme";
  const lensParam = req.query.get("lens");
  const vendors = [...store.vendors.values()].filter((v) => v.orgId === orgId);

  if (!lensParam || !VALID_LENSES.has(lensParam as Lens)) {
    return ok({ vendors });
  }
  const lens = lensParam as Lens;
  const vendorIdsForLens = new Set<string>();
  for (const report of changeReportsForOrg(orgId)) {
    if (readLensTags(report).includes(lens)) {
      vendorIdsForLens.add(report.vendorId);
    }
  }
  const filtered = vendors.filter((v) => vendorIdsForLens.has(v.id));
  return ok({ vendors: filtered.length > 0 ? filtered : vendors });
}

function getVendor(req: MockRequest, id: string): MockResponse {
  const orgId = req.orgId ?? "org_acme";
  const vendor = getOrgVendor(orgId, id);
  if (!vendor) return notFound(`Vendor ${id} not in org`);
  return ok(vendor);
}

function patchVendor(req: MockRequest, id: string): MockResponse {
  const orgId = req.orgId ?? "org_acme";
  const current = getOrgVendor(orgId, id);
  if (!current) return notFound(`Vendor ${id} not in org`);
  const patch = (req.body ?? {}) as Partial<Pick<Vendor, "ownerId" | "tier" | "posture">>;
  const updated: Vendor = { ...current, ...patch };
  store.vendors.set(id, updated);

  // Mirror the backend's per-field event emission so activity timelines stay
  // populated through subsequent reads.
  const activity = store.vendorActivity.get(id) ?? [];
  for (const [field, after] of Object.entries(patch)) {
    const before = (current as unknown as Record<string, unknown>)[field];
    if (before === after) continue;
    activity.push({
      id: newId("evt"),
      kind: "vendor.patch",
      actor: req.userId ?? "system",
      occurredAt: nowIso(),
      title: `${field} updated: ${String(before ?? "—")} → ${String(after ?? "—")}`,
      detail: { field, before, after },
    });
  }
  store.vendorActivity.set(id, activity);
  return ok(updated);
}

function listContracts(req: MockRequest, id: string): MockResponse {
  const orgId = req.orgId ?? "org_acme";
  if (!getOrgVendor(orgId, id)) return notFound(`Vendor ${id} not in org`);
  const contracts = (store.contractFiles.get(id) ?? []).map((c) => ({
    id: c.id,
    vendorId: c.vendorId,
    filename: c.filename,
    sizeBytes: c.sizeBytes,
    uploadedBy: c.uploadedBy,
    uploadedAt: c.uploadedAt,
  }));
  return ok({ contracts });
}

function uploadContract(req: MockRequest, id: string): MockResponse {
  const orgId = req.orgId ?? "org_acme";
  if (!getOrgVendor(orgId, id)) return notFound(`Vendor ${id} not in org`);
  const body = (req.body ?? {}) as {
    filename?: string;
    sizeBytes?: number;
    contentBase64?: string;
  };
  if (!body.filename || !body.sizeBytes) {
    return badRequest("filename and sizeBytes are required");
  }
  const record: ContractFileRecord = {
    id: newId("ctr"),
    vendorId: id,
    filename: body.filename,
    sizeBytes: body.sizeBytes,
    uploadedBy: req.userId ?? "system",
    uploadedAt: nowIso(),
    ...(body.contentBase64 ? { contentBase64: body.contentBase64 } : {}),
  };
  const list = store.contractFiles.get(id) ?? [];
  list.push(record);
  store.contractFiles.set(id, list);

  const activity = store.vendorActivity.get(id) ?? [];
  activity.push({
    id: newId("evt"),
    kind: "contract.upload",
    actor: req.userId ?? "system",
    occurredAt: nowIso(),
    title: `Contract uploaded: ${record.filename}`,
    detail: { contractId: record.id, filename: record.filename },
  });
  store.vendorActivity.set(id, activity);

  return created({
    id: record.id,
    vendorId: record.vendorId,
    filename: record.filename,
    sizeBytes: record.sizeBytes,
    uploadedBy: record.uploadedBy,
    uploadedAt: record.uploadedAt,
  });
}

function downloadContract(_req: MockRequest, vendorId: string, contractId: string): MockResponse {
  const list = store.contractFiles.get(vendorId) ?? [];
  const record = list.find((c) => c.id === contractId);
  if (!record) return notFound(`Contract ${contractId} not found`);
  const text = `Unsyphn contract placeholder for ${record.filename}\nThis is a demo download — no real document is stored.\n`;
  const bytes = new TextEncoder().encode(text);
  return {
    status: 200,
    body: null,
    binary: bytes,
    contentType: "application/octet-stream",
    headers: {
      "Content-Disposition": `attachment; filename="${record.filename}"`,
      "Content-Length": String(bytes.byteLength),
    },
  };
}

function activityTimeline(req: MockRequest, id: string): MockResponse {
  const orgId = req.orgId ?? "org_acme";
  if (!getOrgVendor(orgId, id)) return notFound(`Vendor ${id} not in org`);

  const events: VendorEvent[] = [];
  const seeded = changeReportsForOrg(orgId).filter((r) => r.vendorId === id);
  for (const report of seeded) {
    events.push({
      id: `${report.id}:detected`,
      kind: "change.detected",
      actor: "system",
      occurredAt: report.detectedAt,
      title: report.changes[0]?.summary ?? "Change detected",
      changeReportId: report.id,
      detail: { severity: report.severity },
    });
    if (report.acknowledgedAt) {
      events.push({
        id: `${report.id}:acknowledged`,
        kind: "change.acknowledged",
        actor: report.stateChangedBy ?? "system",
        occurredAt: report.acknowledgedAt,
        title: `Change acknowledged: ${report.changes[0]?.summary ?? report.id}`,
        changeReportId: report.id,
      });
    }
    if (report.snoozedUntil) {
      events.push({
        id: `${report.id}:snoozed`,
        kind: "change.snoozed",
        actor: report.stateChangedBy ?? "system",
        occurredAt: report.snoozedUntil,
        title: `Change snoozed until ${report.snoozedUntil}`,
        changeReportId: report.id,
      });
    }
    if (report.resolvedAt) {
      events.push({
        id: `${report.id}:resolved`,
        kind: "change.resolved",
        actor: report.stateChangedBy ?? "system",
        occurredAt: report.resolvedAt,
        title: `Change resolved: ${report.changes[0]?.summary ?? report.id}`,
        changeReportId: report.id,
      });
    }
    const escalations = store.escalations.get(report.id) ?? [];
    for (const esc of escalations) {
      events.push({
        id: `${report.id}:escalation:${esc.escalatedAt}`,
        kind: "change.escalated",
        actor: esc.byUserId,
        occurredAt: esc.escalatedAt,
        title: `Escalated to ${esc.toRole}`,
        changeReportId: report.id,
        detail: { toRole: esc.toRole, jiraKey: esc.jiraKey, slackChannel: esc.slackChannel },
      });
    }
  }

  for (const ev of store.vendorActivity.get(id) ?? []) {
    events.push(ev);
  }

  events.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

  const feed = seeded
    .map(toFeedChange)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  const latestChangeId = feed[0]?.id ?? null;

  return ok({ events, latestChangeId });
}

function triggerScan(req: MockRequest, id: string): MockResponse {
  const orgId = req.orgId ?? "org_acme";
  if (!getOrgVendor(orgId, id)) return notFound(`Vendor ${id} not in org`);
  const triggeredAt = nowIso();
  const activity = store.vendorActivity.get(id) ?? [];
  activity.push({
    id: newId("evt"),
    kind: "scan.triggered",
    actor: req.userId ?? "system",
    occurredAt: triggeredAt,
    title: "Manual scan triggered",
  });
  store.vendorActivity.set(id, activity);
  return ok({ ok: true, triggeredAt });
}

function renegotiationPacket(req: MockRequest, id: string): MockResponse {
  const orgId = req.orgId ?? "org_acme";
  const vendor = getOrgVendor(orgId, id);
  if (!vendor) return notFound(`Vendor ${id} not in org`);

  const spend = vendor.contract?.annualSpendUsd ?? 100_000;
  const benchmarkLow = Math.round(spend * 0.78);
  const benchmarkHigh = Math.round(spend * 0.92);
  const recoverable = Math.max(0, spend - benchmarkHigh);

  // Record an activity event so subsequent timeline reads surface it.
  const activity = store.vendorActivity.get(id) ?? [];
  activity.push({
    id: newId("evt"),
    kind: "packet.generated",
    actor: req.userId ?? "system",
    occurredAt: nowIso(),
    title: "Renegotiation packet generated",
  });
  store.vendorActivity.set(id, activity);

  return ok({
    vendorId: id,
    vendorName: vendor.name,
    currentSpend: spend,
    benchmarkRange: { low: benchmarkLow, high: benchmarkHigh },
    usagePct: 64,
    recoverableUsd: recoverable,
    drafts: [
      {
        tone: "firm",
        subject: `Renewal terms for ${vendor.name}`,
        body: `Hello,\n\nAhead of the upcoming renewal we'd like to flag that current annual spend is $${spend.toLocaleString()}, above the $${benchmarkLow.toLocaleString()}-$${benchmarkHigh.toLocaleString()} peer benchmark. Open to discussing a fit-for-purpose package this cycle.\n\nThanks,\nProcurement`,
      },
      {
        tone: "collaborative",
        subject: `Partnership review — ${vendor.name}`,
        body: `Hi team,\n\nAs we approach renewal we'd love a quick read-out on usage trends and roadmap. Aiming to land a multi-year structure that reflects observed usage — happy to share data on our side.\n\nBest,\nProcurement`,
      },
    ],
    talkingPoints: [
      `Current spend $${spend.toLocaleString()} vs. peer median $${Math.round((benchmarkLow + benchmarkHigh) / 2).toLocaleString()}.`,
      "Seat utilization trending below 70% across last two quarters.",
      "Two competitive alternatives evaluated in the last 90 days.",
    ],
  });
}

function subProcessorsHandler(req: MockRequest, id: string): MockResponse {
  const entry: SubProcessorVendorEntry | undefined = store.subProcessors.get(id);
  if (!entry) return notFound(`No sub-processor data found for vendor ${id}`);
  const flagged = entry.subProcessors.filter((sp) => sp.flagged === true);
  const flaggedCount = flagged.length;

  const customerNotifications = flagged.length === 0
    ? []
    : [...store.customerContracts.values()]
        .filter((c) => c.notifiedSubProcessors.length > 0)
        .map((c) => {
          const first = flagged[0]!;
          const addedAt = new Date(first.addedAt);
          addedAt.setUTCDate(addedAt.getUTCDate() + c.noticeDays);
          const notifyByDate = addedAt.toISOString().split("T")[0] ?? first.addedAt;
          return {
            customerName: c.customerName,
            contractId: c.contractId,
            domain: c.domain,
            ourObligation: `${c.noticeDays}-day notice for non-adequate jurisdiction additions (${c.dpaClause})`,
            affectedSubProcessor: first.name,
            notifyByDate,
            suggestedAction: "Draft notice email",
          };
        });

  return ok({
    vendorId: id,
    vendorName: entry.vendorName,
    subProcessors: entry.subProcessors,
    lastChangeAt: entry.lastChangeAt,
    flaggedCount,
    customerNotifications,
  });
}

export function registerVendorHandlers(): void {
  register("GET", /^\/v1\/vendors$/, listVendors);
  register("GET", /^\/v1\/vendors\/([^/]+)$/, (req, p) => getVendor(req, p[0] ?? ""));
  register("PATCH", /^\/v1\/vendors\/([^/]+)$/, (req, p) => patchVendor(req, p[0] ?? ""));
  register("GET", /^\/v1\/vendors\/([^/]+)\/contracts$/, (req, p) =>
    listContracts(req, p[0] ?? ""),
  );
  register("POST", /^\/v1\/vendors\/([^/]+)\/contracts$/, (req, p) =>
    uploadContract(req, p[0] ?? ""),
  );
  register("GET", /^\/v1\/vendors\/([^/]+)\/contracts\/([^/]+)\/download$/, (req, p) =>
    downloadContract(req, p[0] ?? "", p[1] ?? ""),
  );
  register("GET", /^\/v1\/vendors\/([^/]+)\/activity$/, (req, p) =>
    activityTimeline(req, p[0] ?? ""),
  );
  register("POST", /^\/v1\/vendors\/([^/]+)\/scan$/, (req, p) =>
    triggerScan(req, p[0] ?? ""),
  );
  register("POST", /^\/v1\/vendors\/([^/]+)\/renegotiation-packet$/, (req, p) =>
    renegotiationPacket(req, p[0] ?? ""),
  );
  register("GET", /^\/v1\/vendors\/([^/]+)\/sub-processors$/, (req, p) =>
    subProcessorsHandler(req, p[0] ?? ""),
  );
}
