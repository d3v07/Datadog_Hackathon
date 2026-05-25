// Renewals kanban — list, status mutation, full patch. Mirrors
// apps/api/src/routes/renewals.ts including the lensTagsForVendor union over
// change reports and the dto shape (recommendedAction etc.).

import type { Lens, Renewal, RenewalStatus } from "@unsyphn/shared";
import { changeReportsForOrg, readLensTags } from "../projections.js";
import { register } from "../router.js";
import {
  store,
  type RenewalColumn,
  type RenewalRecord,
} from "../store.js";
import {
  badRequest,
  notFound,
  ok,
  type MockRequest,
  type MockResponse,
} from "../types.js";

const VALID_COLUMNS: ReadonlyArray<RenewalColumn> = ["triage", "negotiate", "sign"];

function daysOut(renewsAt: string, now: Date): number {
  const target = Date.parse(renewsAt);
  if (!Number.isFinite(target)) return 0;
  return Math.round((target - now.getTime()) / 86_400_000);
}

function lensTagsForVendor(orgId: string, vendorId: string): Lens[] {
  const seen = new Set<Lens>();
  for (const report of changeReportsForOrg(orgId)) {
    if (report.vendorId !== vendorId) continue;
    for (const t of readLensTags(report)) seen.add(t);
  }
  return [...seen];
}

function toDto(orgId: string, record: RenewalRecord, now: Date): Renewal & {
  recommendedAction: string;
  blockerCount: number;
  seatUtilizationPct: number;
} {
  const owner = store.users.get(record.ownerId);
  return {
    id: record.id,
    vendorId: record.vendorId,
    vendorName: record.vendorName,
    renewsAt: record.renewsAt,
    daysOut: daysOut(record.renewsAt, now),
    annualValueUsd: record.annualSpendUsd,
    ownerEmail: owner?.email ?? "owner@acme.dev",
    ownerId: record.ownerId,
    status: record.currentColumn as RenewalStatus,
    benchmarkDelta: record.priceDeltaPct,
    declined: record.declined ?? false,
    autoRenewed: record.autoRenewed ?? false,
    lensTags: lensTagsForVendor(orgId, record.vendorId),
    recommendedAction: record.recommendedAction,
    blockerCount: record.blockerCount,
    seatUtilizationPct: record.seatUtilizationPct,
  };
}

function listRenewals(req: MockRequest): MockResponse {
  const orgId = req.orgId ?? "org_acme";
  const days = Number(req.query.get("days") ?? 365);
  const column = req.query.get("column");
  const now = new Date();

  let records = [...store.renewals.values()];
  if (column && (VALID_COLUMNS as ReadonlyArray<string>).includes(column)) {
    records = records.filter((r) => r.currentColumn === column);
  }

  const renewals = records
    .map((r) => toDto(orgId, r, now))
    .filter((r) => (Number.isFinite(days) ? r.daysOut <= days : true))
    .sort((a, b) => a.daysOut - b.daysOut);

  return ok({ renewals });
}

function getRenewal(req: MockRequest, id: string): MockResponse {
  const orgId = req.orgId ?? "org_acme";
  const record = store.renewals.get(id);
  if (!record) return notFound(`No renewal found with id ${id}`);
  return ok({ renewal: toDto(orgId, record, new Date()) });
}

function setStatus(req: MockRequest, id: string): MockResponse {
  const orgId = req.orgId ?? "org_acme";
  const body = (req.body ?? {}) as { column?: string };
  const column = body.column;
  if (!column || !(VALID_COLUMNS as ReadonlyArray<string>).includes(column)) {
    return badRequest(`column must be one of: ${VALID_COLUMNS.join(", ")}`);
  }
  const current = store.renewals.get(id);
  if (!current) return notFound(`No renewal found with id ${id}`);
  const updated: RenewalRecord = { ...current, currentColumn: column as RenewalColumn };
  store.renewals.set(id, updated);
  return ok({ renewal: toDto(orgId, updated, new Date()) });
}

function patchRenewal(req: MockRequest, id: string): MockResponse {
  const orgId = req.orgId ?? "org_acme";
  const current = store.renewals.get(id);
  if (!current) return notFound(`No renewal found with id ${id}`);
  const body = (req.body ?? {}) as {
    column?: RenewalColumn;
    ownerId?: string;
    declined?: boolean;
    autoRenewed?: boolean;
  };
  if (
    body.column === undefined &&
    body.ownerId === undefined &&
    body.declined === undefined &&
    body.autoRenewed === undefined
  ) {
    return badRequest("At least one of column, ownerId, declined, autoRenewed must be provided");
  }
  const updated: RenewalRecord = {
    ...current,
    ...(body.column !== undefined ? { currentColumn: body.column } : {}),
    ...(body.ownerId !== undefined ? { ownerId: body.ownerId } : {}),
    ...(body.declined !== undefined ? { declined: body.declined } : {}),
    ...(body.autoRenewed !== undefined ? { autoRenewed: body.autoRenewed } : {}),
  };
  store.renewals.set(id, updated);
  return ok({ renewal: toDto(orgId, updated, new Date()) });
}

export function registerRenewalHandlers(): void {
  register("GET", /^\/v1\/renewals$/, listRenewals);
  register("GET", /^\/v1\/renewals\/([^/]+)$/, (req, p) =>
    getRenewal(req, p[0] ?? ""),
  );
  register("POST", /^\/v1\/renewals\/([^/]+)\/status$/, (req, p) =>
    setStatus(req, p[0] ?? ""),
  );
  register("PATCH", /^\/v1\/renewals\/([^/]+)$/, (req, p) =>
    patchRenewal(req, p[0] ?? ""),
  );
}
