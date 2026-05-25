import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Hono } from "hono";
import { ApiError } from "../lib/errors.js";
import { ErrorCodes } from "@unsyphn/shared";
import { customerContractsStore } from "../db/customer-contracts-store.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

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

type SeedData = Record<string, VendorSeedEntry>;

interface CustomerNotification {
  customerName: string;
  contractId: string;
  domain: string;
  ourObligation: string;
  affectedSubProcessor: string;
  notifyByDate: string;
  suggestedAction: string;
}

function loadSeed(): SeedData {
  const path = resolve(__dirname, "../seed/sub-processors.json");
  return JSON.parse(readFileSync(path, "utf8")) as SeedData;
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0] ?? isoDate;
}

function buildNotifications(flaggedSPs: SubProcessor[]): CustomerNotification[] {
  if (flaggedSPs.length === 0) return [];
  const firstFlagged = flaggedSPs[0]!;

  return customerContractsStore
    .listNotificationCandidates()
    .map((c) => ({
      customerName: c.customerName,
      contractId: c.contractId,
      domain: c.domain,
      ourObligation: `${c.noticeDays}-day notice for non-adequate jurisdiction additions (${c.dpaClause})`,
      affectedSubProcessor: firstFlagged.name,
      notifyByDate: addDays(firstFlagged.addedAt, c.noticeDays),
      suggestedAction: "Draft notice email",
    }));
}

export const subProcessorsRoute = new Hono();

subProcessorsRoute.get("/:id/sub-processors", (c) => {
  const vendorId = c.req.param("id");
  const seed = loadSeed();
  const entry = seed[vendorId];

  if (!entry) {
    throw new ApiError(ErrorCodes.NotFound, `No sub-processor data found for vendor ${vendorId}`);
  }

  const flaggedSPs = entry.subProcessors.filter((sp) => sp.flagged === true);
  const flaggedCount = flaggedSPs.length;
  const customerNotifications = buildNotifications(flaggedSPs);

  return c.json({
    vendorId,
    vendorName: entry.vendorName,
    subProcessors: entry.subProcessors,
    lastChangeAt: entry.lastChangeAt,
    flaggedCount,
    customerNotifications,
  });
});
