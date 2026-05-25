import { Hono } from "hono";
import { z } from "zod";
import type { Lens, Renewal, RenewalStatus } from "@unsyphn/shared";
import {
  renewalsStore,
  type RenewalColumn,
  type RenewalPatch,
  type RenewalRecord,
} from "../db/renewals-store.js";
import { getSeededChangeReports, getUser } from "../seed/loader.js";
import { readLensTags } from "../lib/change-report-views.js";
import { ApiError } from "../lib/errors.js";
import { ErrorCodes } from "@unsyphn/shared";

const VALID_COLUMNS: ReadonlyArray<RenewalColumn> = ["triage", "negotiate", "sign"];

const PatchSchema = z
  .object({
    column: z.enum(["triage", "negotiate", "sign"]).optional(),
    ownerId: z.string().min(1).optional(),
    declined: z.boolean().optional(),
    autoRenewed: z.boolean().optional(),
  })
  .strict()
  .refine(
    (v) =>
      v.column !== undefined ||
      v.ownerId !== undefined ||
      v.declined !== undefined ||
      v.autoRenewed !== undefined,
    { message: "At least one of column, ownerId, declined, autoRenewed must be provided" },
  );

function daysOut(renewsAt: string, now: Date): number {
  const target = Date.parse(renewsAt);
  if (!Number.isFinite(target)) return 0;
  return Math.round((target - now.getTime()) / 86_400_000);
}

// Derive lens tags for a vendor by union over its seeded change reports'
// lensTags. Empty when the vendor has no change reports — frontend falls
// back to "show all" in that case.
function lensTagsForVendor(vendorId: string): Lens[] {
  const seen = new Set<Lens>();
  for (const report of getSeededChangeReports()) {
    if (report.vendorId !== vendorId) continue;
    for (const t of readLensTags(report)) seen.add(t);
  }
  return [...seen];
}

function toRenewalDto(record: RenewalRecord, now: Date): Renewal & {
  recommendedAction: string;
  blockerCount: number;
  seatUtilizationPct: number;
} {
  const owner = getUser(record.ownerId);
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
    lensTags: lensTagsForVendor(record.vendorId),
    recommendedAction: record.recommendedAction,
    blockerCount: record.blockerCount,
    seatUtilizationPct: record.seatUtilizationPct,
  };
}

export const renewalsRoute = new Hono();

renewalsRoute.get("/", (c) => {
  const days = Number(c.req.query("days") ?? 365);
  const column = c.req.query("column");
  const now = new Date();

  let records = renewalsStore.list();

  if (column && (VALID_COLUMNS as ReadonlyArray<string>).includes(column)) {
    records = records.filter((r) => r.currentColumn === column);
  }

  const renewals = records
    .map((r) => toRenewalDto(r, now))
    .filter((r) => Number.isFinite(days) ? r.daysOut <= days : true)
    .sort((a, b) => a.daysOut - b.daysOut);

  return c.json({ renewals });
});

renewalsRoute.post("/:id/status", async (c) => {
  const id = c.req.param("id");
  const body = (await c.req.json().catch(() => ({}))) as { column?: string };
  const column = body.column;
  if (!column || !(VALID_COLUMNS as ReadonlyArray<string>).includes(column)) {
    throw new ApiError(
      ErrorCodes.Unprocessable,
      `column must be one of: ${VALID_COLUMNS.join(", ")}`,
    );
  }
  const updated = renewalsStore.setColumn(id, column as RenewalColumn);
  if (!updated) {
    throw new ApiError(ErrorCodes.NotFound, `No renewal found with id ${id}`);
  }
  const dto = toRenewalDto(updated, new Date());
  return c.json({ renewal: dto });
});

renewalsRoute.patch("/:id", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");

  const current = renewalsStore.get(id);
  if (!current) {
    throw new ApiError(ErrorCodes.NotFound, `No renewal found with id ${id}`);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    throw new ApiError(ErrorCodes.ValidationFailed, "Body must be JSON");
  }

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(ErrorCodes.Unprocessable, "Request body is invalid", {
      issues: parsed.error.flatten(),
    });
  }

  // Owner must belong to caller's org (mirrors vendors.ts).
  if (parsed.data.ownerId !== undefined) {
    const owner = getUser(parsed.data.ownerId);
    if (!owner || owner.orgId !== orgId) {
      throw new ApiError(
        ErrorCodes.Unprocessable,
        `ownerId ${parsed.data.ownerId} is not a user in this org`,
        { path: ["ownerId"] },
      );
    }
  }

  const patch: RenewalPatch = {};
  if (parsed.data.column !== undefined) patch.currentColumn = parsed.data.column;
  if (parsed.data.ownerId !== undefined) patch.ownerId = parsed.data.ownerId;
  if (parsed.data.declined !== undefined) patch.declined = parsed.data.declined;
  if (parsed.data.autoRenewed !== undefined) patch.autoRenewed = parsed.data.autoRenewed;

  const updated = renewalsStore.update(id, patch);
  if (!updated) {
    throw new ApiError(ErrorCodes.NotFound, `Renewal ${id} disappeared`);
  }
  return c.json({ renewal: toRenewalDto(updated, new Date()) });
});
