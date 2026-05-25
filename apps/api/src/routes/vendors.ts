import { Hono } from "hono";
import { z } from "zod";
import {
  ErrorCodes,
  VendorCreateSchema,
  type ChangeReportId,
  type Lens,
  type Vendor,
  type VendorCreateResponse,
  type VendorUrls,
} from "@unsyphn/shared";
import { ApiError } from "../lib/errors.js";
import { newId } from "../lib/ids.js";
import { discoverUrls, type DiscoveryOptions } from "../lib/discovery.js";
import { vendorStore } from "../db/vendor-store.js";
import { contractsStore } from "../db/contracts-store.js";
import { vendorEventsStore } from "../db/vendor-events-store.js";
import {
  getSeededChangeReports,
  getUser,
} from "../seed/loader.js";
import { readLensTags, toFeedChange } from "../lib/change-report-views.js";
import { queueFirstScan } from "../agent/queue.js";
import type { ChangeReportRepository } from "../db/changeReports.js";

const VALID_LENSES = new Set<Lens>([
  "procurement",
  "legal",
  "security",
  "finance",
  "it",
  "audit",
]);

const VendorPatchSchema = z.object({
  ownerId: z.string().optional(),
  tier: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  posture: z.enum(["ok", "watch", "risk"]).optional(),
});

const ContractUploadSchema = z.object({
  filename: z.string().min(1).max(200),
  sizeBytes: z.number().int().positive(),
  contentBase64: z.string().min(1),
});

const MAX_CONTRACT_BYTES = 10_000_000;

export interface VendorsRouteOverrides {
  discovery?: DiscoveryOptions;
  stubRunner?: { stageDelayMs?: number };
}

let overrides: VendorsRouteOverrides = {};

// Tests use this to inject a mock fetcher and a 0ms stage delay so the runner
// resolves synchronously enough to assert on.
export function setVendorsRouteOverrides(o: VendorsRouteOverrides): void {
  overrides = o;
}

function flattenZodIssue(err: z.ZodError): {
  message: string;
  details: Record<string, unknown>;
} {
  const issue = err.issues[0];
  if (!issue) return { message: "Body did not parse", details: {} };
  const path = issue.path.join(".");
  return {
    message: path ? `${path}: ${issue.message}` : issue.message,
    details: { path: issue.path, issues: err.issues },
  };
}

// Phase 4 uses an optional reports repo for the Activity timeline. The legacy
// `vendorsRoute` export is preserved (created with no repo) so existing
// imports keep working; `createVendorsRouter` is the new factory.
export function createVendorsRouter(deps: { reports?: ChangeReportRepository } = {}): Hono {
  const router = new Hono();

  router.post("/", async (c) => {
    const orgId = c.get("orgId");

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      throw new ApiError(ErrorCodes.ValidationFailed, "Body must be JSON");
    }

    const parsed = VendorCreateSchema.safeParse(body);
    if (!parsed.success) {
      const { message, details } = flattenZodIssue(parsed.error);
      throw new ApiError(ErrorCodes.ValidationFailed, message, details);
    }
    const input = parsed.data;

    const owner = getUser(input.ownerId);
    if (!owner || owner.orgId !== orgId) {
      throw new ApiError(
        ErrorCodes.Unprocessable,
        `ownerId ${input.ownerId} is not a user in this org`,
        { path: ["ownerId"] },
      );
    }

    const dupe = vendorStore.findByHomepage(orgId, input.homepageUrl);
    if (dupe) {
      throw new ApiError(
        ErrorCodes.Duplicate,
        `A vendor with this homepage already exists`,
        { vendorId: dupe.id, name: dupe.name },
      );
    }

    const discovered = await discoverUrls(input.homepageUrl, overrides.discovery);
    if (discovered.missing.length > 0) {
      throw new ApiError(
        ErrorCodes.DiscoveryIncomplete,
        `Could not discover ${discovered.missing.join(", ")} from ${input.homepageUrl}`,
        { found: discovered.found, missing: discovered.missing },
      );
    }

    const urls: VendorUrls = {
      homepage: input.homepageUrl,
      terms: discovered.found.terms!,
      pricing: discovered.found.pricing!,
      dpa: discovered.found.dpa!,
      subProcessors: discovered.found.subProcessors!,
      security: discovered.found.security!,
      sla: discovered.found.sla!,
    };

    const vendor: Vendor = {
      id: newId("vendor"),
      orgId,
      name: input.name,
      category: "uncategorized",
      tier: input.tier,
      posture: "ok",
      dataClasses: input.dataClasses,
      ownerId: input.ownerId,
      urls,
    };
    if (input.contract) vendor.contract = input.contract;
    vendorStore.add(vendor);

    const { runId } = await queueFirstScan(
      { orgId, vendorId: vendor.id },
      overrides.stubRunner,
    );

    const response: VendorCreateResponse = {
      id: vendor.id,
      name: vendor.name,
      firstScanRunId: runId,
      discoveredUrls: urls,
    };
    return c.json(response, 201);
  });

  // GET /v1/vendors[?lens=<lens>] — list vendors for the calling org.
  router.get("/", (c) => {
    const orgId = c.get("orgId");
    const lensParam = c.req.query("lens");
    const vendors = vendorStore.list(orgId);

    if (!lensParam || !VALID_LENSES.has(lensParam as Lens)) {
      return c.json({ vendors });
    }
    const lens = lensParam as Lens;

    const vendorIdsForLens = new Set<string>();
    for (const report of getSeededChangeReports()) {
      if (report.orgId !== orgId) continue;
      if (readLensTags(report).includes(lens)) {
        vendorIdsForLens.add(report.vendorId);
      }
    }

    const filtered = vendors.filter((v) => vendorIdsForLens.has(v.id));
    return c.json({ vendors: filtered.length > 0 ? filtered : vendors });
  });

  // GET /v1/vendors/:id — fetch a single vendor in the calling org.
  router.get("/:id", (c) => {
    const orgId = c.get("orgId");
    const id = c.req.param("id");
    const vendor = vendorStore.get(id);
    if (!vendor || vendor.orgId !== orgId) {
      throw new ApiError(ErrorCodes.NotFound, `Vendor ${id} not in org`);
    }
    return c.json(vendor);
  });

  // PATCH /v1/vendors/:id — mutate ownerId / tier / posture on a vendor.
  router.patch("/:id", async (c) => {
    const orgId = c.get("orgId");
    const id = c.req.param("id");

    const current = vendorStore.get(id);
    if (!current || current.orgId !== orgId) {
      throw new ApiError(ErrorCodes.NotFound, `Vendor ${id} not in org`);
    }

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      throw new ApiError(ErrorCodes.ValidationFailed, "Body must be JSON");
    }

    const parsed = VendorPatchSchema.safeParse(body);
    if (!parsed.success) {
      const { message, details } = flattenZodIssue(parsed.error);
      throw new ApiError(ErrorCodes.ValidationFailed, message, details);
    }
    const patch = parsed.data;

    if (patch.ownerId) {
      const owner = getUser(patch.ownerId);
      if (!owner || owner.orgId !== orgId) {
        throw new ApiError(
          ErrorCodes.Unprocessable,
          `ownerId ${patch.ownerId} is not a user in this org`,
          { path: ["ownerId"] },
        );
      }
    }

    const auth = c.get("auth");
    const actor = auth?.userId ?? "system";

    const updated = vendorStore.update(id, patch);
    if (!updated) {
      throw new ApiError(ErrorCodes.NotFound, `Vendor ${id} disappeared`);
    }

    // Record one event per field changed so the activity timeline reads cleanly.
    for (const [field, after] of Object.entries(patch)) {
      const before = (current as unknown as Record<string, unknown>)[field];
      if (before === after) continue;
      vendorEventsStore.add({
        vendorId: id,
        kind: "vendor.patch",
        actor,
        occurredAt: new Date().toISOString(),
        detail: { field, before, after },
      });
    }
    return c.json(updated);
  });

  // GET /v1/vendors/:id/contracts — list uploaded contracts for a vendor.
  router.get("/:id/contracts", (c) => {
    const orgId = c.get("orgId");
    const id = c.req.param("id");
    const vendor = vendorStore.get(id);
    if (!vendor || vendor.orgId !== orgId) {
      throw new ApiError(ErrorCodes.NotFound, `Vendor ${id} not in org`);
    }
    const contracts = contractsStore.listByVendor(id).map((r) => ({
      id: r.id,
      vendorId: r.vendorId,
      filename: r.filename,
      sizeBytes: r.sizeBytes,
      uploadedBy: r.uploadedBy,
      uploadedAt: r.uploadedAt,
    }));
    return c.json({ contracts });
  });

  // POST /v1/vendors/:id/contracts — JSON body { filename, sizeBytes, contentBase64 }.
  router.post("/:id/contracts", async (c) => {
    const orgId = c.get("orgId");
    const id = c.req.param("id");
    const vendor = vendorStore.get(id);
    if (!vendor || vendor.orgId !== orgId) {
      throw new ApiError(ErrorCodes.NotFound, `Vendor ${id} not in org`);
    }

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      throw new ApiError(ErrorCodes.ValidationFailed, "Body must be JSON");
    }

    const parsed = ContractUploadSchema.safeParse(body);
    if (!parsed.success) {
      const { message, details } = flattenZodIssue(parsed.error);
      throw new ApiError(ErrorCodes.ValidationFailed, message, details);
    }

    if (parsed.data.sizeBytes > MAX_CONTRACT_BYTES) {
      throw new ApiError(
        ErrorCodes.Unprocessable,
        `Contract file exceeds ${MAX_CONTRACT_BYTES} bytes`,
        { sizeBytes: parsed.data.sizeBytes, max: MAX_CONTRACT_BYTES },
      );
    }

    const auth = c.get("auth");
    const actor = auth?.userId ?? "system";
    const now = new Date().toISOString();

    const record = contractsStore.add({
      vendorId: id,
      filename: parsed.data.filename,
      sizeBytes: parsed.data.sizeBytes,
      contentBase64: parsed.data.contentBase64,
      uploadedBy: actor,
      uploadedAt: now,
    });

    vendorEventsStore.add({
      vendorId: id,
      kind: "contract.upload",
      actor,
      occurredAt: now,
      detail: { contractId: record.id, filename: record.filename },
    });

    return c.json(
      {
        id: record.id,
        vendorId: record.vendorId,
        filename: record.filename,
        sizeBytes: record.sizeBytes,
        uploadedBy: record.uploadedBy,
        uploadedAt: record.uploadedAt,
      },
      201,
    );
  });

  // GET /v1/vendors/:id/activity — unified audit log for the vendor.
  router.get("/:id/activity", async (c) => {
    const orgId = c.get("orgId");
    const id = c.req.param("id");
    const vendor = vendorStore.get(id);
    if (!vendor || vendor.orgId !== orgId) {
      throw new ApiError(ErrorCodes.NotFound, `Vendor ${id} not in org`);
    }

    const events: Array<{
      id: string;
      kind: string;
      actor: string;
      occurredAt: string;
      title: string;
      detail?: Record<string, unknown>;
      changeReportId?: string;
    }> = [];

    // 1. Seeded ChangeReports: detection + lifecycle timestamps.
    const seeded = getSeededChangeReports().filter(
      (r) => r.orgId === orgId && r.vendorId === id,
    );
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

      // Lifecycle timestamps if present. The seeded repo holds the most
      // recent version; mutations via /v1/changes/:id/* are also captured
      // by querying the live reports repo below if provided.
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
    }

    // 2. Live lifecycle versions and escalations from the runtime repo.
    if (deps.reports) {
      for (const report of seeded) {
        try {
          const escalations = await deps.reports.listEscalations(
            report.id as ChangeReportId,
          );
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
        } catch {
          // If repo lookups throw we still want the rest of the timeline.
        }
      }
    }

    // 3. Vendor-level events (PATCH, contracts, packets, scans).
    for (const ev of vendorEventsStore.listByVendor(id)) {
      let title: string = ev.kind;
      if (ev.kind === "vendor.patch" && ev.detail) {
        const { field, before, after } = ev.detail as { field?: string; before?: unknown; after?: unknown };
        title = `${field ?? "Field"} updated: ${String(before ?? "—")} → ${String(after ?? "—")}`;
      } else if (ev.kind === "contract.upload" && ev.detail) {
        title = `Contract uploaded: ${(ev.detail as { filename?: string }).filename ?? "file"}`;
      } else if (ev.kind === "packet.generated") {
        title = "Renegotiation packet generated";
      } else if (ev.kind === "scan.triggered") {
        title = "Manual scan triggered";
      }
      const baseEvent: {
        id: string;
        kind: string;
        actor: string;
        occurredAt: string;
        title: string;
        detail?: Record<string, unknown>;
      } = {
        id: ev.id,
        kind: ev.kind,
        actor: ev.actor,
        occurredAt: ev.occurredAt,
        title,
      };
      if (ev.detail) baseEvent.detail = ev.detail;
      events.push(baseEvent);
    }

    events.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

    // Latest change report id for "Export evidence bundle" linking.
    const feed = seeded
      .map(toFeedChange)
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
    const latestChangeId = feed[0]?.id ?? null;

    return c.json({ events, latestChangeId });
  });

  // POST /v1/vendors/:id/scan — record a manual scan trigger (synthetic).
  router.post("/:id/scan", (c) => {
    const orgId = c.get("orgId");
    const id = c.req.param("id");
    const vendor = vendorStore.get(id);
    if (!vendor || vendor.orgId !== orgId) {
      throw new ApiError(ErrorCodes.NotFound, `Vendor ${id} not in org`);
    }
    const auth = c.get("auth");
    const actor = auth?.userId ?? "system";
    const ev = vendorEventsStore.add({
      vendorId: id,
      kind: "scan.triggered",
      actor,
      occurredAt: new Date().toISOString(),
    });
    return c.json({ ok: true, triggeredAt: ev.occurredAt });
  });

  return router;
}

// Preserve the existing module-level export so external imports
// (apps/api/src/app.ts pre-Phase-4) still work. The factory in
// `createVendorsRouter` is the preferred entry point.
export const vendorsRoute = createVendorsRouter();
