import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Hono } from "hono";
import { ApiError } from "../lib/errors.js";
import { ErrorCodes } from "@unsyphn/shared";

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

interface CustomerContract {
  customerId: string;
  customerName: string;
  contractId: string;
  domain: string;
  dpaClause: string;
  noticeDays: number;
}

interface CustomerNotification {
  customerName: string;
  contractId: string;
  domain: string;
  ourObligation: string;
  affectedSubProcessor: string;
  notifyByDate: string;
  suggestedAction: string;
}

const CUSTOMER_CONTRACTS: CustomerContract[] = [
  { customerId: "cust_001", customerName: "Acme Corp",      contractId: "contract_001", domain: "acme.com",         dpaClause: "§8.3 Sub-processor Changes", noticeDays: 30 },
  { customerId: "cust_002", customerName: "TechStart",      contractId: "contract_005", domain: "techstart.io",     dpaClause: "§6.2 Sub-processor Notification", noticeDays: 30 },
  { customerId: "cust_003", customerName: "BigBank",        contractId: "contract_012", domain: "bigbank.com",      dpaClause: "§9.1 Data Processor Changes", noticeDays: 30 },
  { customerId: "cust_004", customerName: "HealthNet",      contractId: "contract_019", domain: "healthnet.org",    dpaClause: "§7.4 Sub-processor Amendments", noticeDays: 30 },
  { customerId: "cust_005", customerName: "RetailCo",       contractId: "contract_023", domain: "retailco.com",     dpaClause: "§5.8 Third-party Processors",  noticeDays: 30 },
  { customerId: "cust_006", customerName: "EduPlatform",    contractId: "contract_031", domain: "eduplatform.net",  dpaClause: "§4.3 Sub-processor Disclosure", noticeDays: 30 },
  { customerId: "cust_007", customerName: "MediaGroup",     contractId: "contract_038", domain: "mediagroup.tv",    dpaClause: "§11.2 Data Transfers",          noticeDays: 30 },
  { customerId: "cust_008", customerName: "LogiCorp",       contractId: "contract_044", domain: "logicorp.eu",      dpaClause: "§8.1 Sub-processor Registry",   noticeDays: 30 },
  { customerId: "cust_009", customerName: "FinServ Ltd",    contractId: "contract_052", domain: "finserv.co.uk",    dpaClause: "§6.5 Processor Amendments",     noticeDays: 30 },
  { customerId: "cust_010", customerName: "AutoDrive",      contractId: "contract_058", domain: "autodrive.io",     dpaClause: "§9.3 Sub-processor Changes",    noticeDays: 30 },
  { customerId: "cust_011", customerName: "CloudNine Inc",  contractId: "contract_067", domain: "cloudnine.com",    dpaClause: "§7.1 Third-party Processors",   noticeDays: 30 },
  { customerId: "cust_012", customerName: "PharmaCore",     contractId: "contract_073", domain: "pharmacore.com",   dpaClause: "§10.2 Sub-processor Audit",     noticeDays: 30 },
];

// Only the top 3 contracts trigger notifications — flagship demo customers
const NOTIFIED_CONTRACT_IDS = new Set(["contract_001", "contract_005", "contract_012"]);

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

  return CUSTOMER_CONTRACTS
    .filter((c) => NOTIFIED_CONTRACT_IDS.has(c.contractId))
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
