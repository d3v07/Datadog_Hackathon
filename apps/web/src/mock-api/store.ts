// Mock-API store — in-memory mutable seed snapshot for the static demo build.
// Seed JSON is imported at module load (Vite inlines it into the bundle); each
// entity gets a Map keyed by id so handlers can mutate state across requests
// without round-tripping a real backend.

import type {
  ChangeReport,
  IntakeRequest,
  Lens,
  Org,
  Renewal,
  User,
  Vendor,
} from "@unsyphn/shared";

import orgsRaw from "../../../../seed/orgs.json";
import usersRaw from "../../../../seed/users.json";
import tokensRaw from "../../../../seed/tokens.json";
import vendorsRaw from "../../../../seed/vendors.json";
import changeReportsRaw from "../../../../seed/change-reports.json";
import renewalsRaw from "../../../../seed/renewals.json";
import requestsRaw from "../../../../seed/requests.json";
import integrationsRaw from "../../../../seed/integrations.json";
import customerContractsRaw from "../../../../seed/customer-contracts.json";
import policiesRaw from "../../../../seed/policies.json";
import subProcessorsRaw from "../../../api/src/seed/sub-processors.json";

// Re-exported domain types that aren't in @unsyphn/shared but are required by
// handlers. Mirror the relevant shape from apps/api so callers stay typed.

export type RenewalColumn = "triage" | "negotiate" | "sign";

export interface RenewalRecord {
  id: string;
  vendorId: string;
  vendorName: string;
  renewsAt: string;
  annualSpendUsd: number;
  currentColumn: RenewalColumn;
  ownerId: string;
  priceDeltaPct: number;
  seatUtilizationPct: number;
  blockerCount: number;
  recommendedAction: string;
  declined?: boolean;
  autoRenewed?: boolean;
}

export type RequestStatus = "pending" | "approved" | "rejected" | "routed";

export interface RequestComment {
  id: string;
  by: string;
  at: string;
  text: string;
}

export interface IntakeRequestRecord {
  id: string;
  orgId: string;
  requesterId: string;
  vendorName: string;
  category: string;
  expectedSpendUsd: number;
  justification: string;
  similarTools: string[];
  status: RequestStatus;
  submittedAt: string;
  approverId?: string;
  decidedAt?: string;
  routeTo?: string;
  comments: RequestComment[];
}

export type IntegrationCategory = "inbound" | "outbound";

export interface IntegrationField {
  key: string;
  label: string;
  placeholder?: string;
  sensitive?: boolean;
  optional?: boolean;
}

export interface IntegrationRecord {
  id: string;
  name: string;
  slug: string;
  category: IntegrationCategory;
  description: string;
  authType: "oauth" | "api-key" | "saml";
  iconSlug?: string;
  iconColor?: string;
  requiredFields: IntegrationField[];
  defaultScopes: string[];
  connected: boolean;
  scopes?: string[];
  connectedAs?: string;
  connectedAt?: string;
  lastSyncedAt?: string;
}

export interface SyncRecord {
  id: string;
  startedAt: string;
  durationMs: number;
  recordsScanned: number;
  status: "success" | "partial";
}

export interface CustomerContractRecord {
  id: string;
  customerId: string;
  customerName: string;
  contractId: string;
  domain: string;
  contractStart: string;
  contractEnd: string;
  annualValueUsd: number;
  dataResidency: string;
  dpaClause: string;
  noticeDays: number;
  notifiedSubProcessors: string[];
}

export interface SubProcessor {
  name: string;
  jurisdiction: string;
  purpose: string;
  adequate: boolean;
  addedAt: string;
  flagged?: boolean;
  flagReason?: string;
}

export interface SubProcessorVendorEntry {
  vendorName: string;
  subProcessors: SubProcessor[];
  lastChangeAt: string;
}

export interface PolicyRecord {
  id: string;
  orgId: string;
  name: string;
  description: string;
  version: number;
  createdBy: string;
  isActive: boolean;
  severity: string;
  route: string[];
}

export interface VendorEvent {
  id: string;
  kind: string;
  actor: string;
  occurredAt: string;
  title: string;
  detail?: Record<string, unknown>;
  changeReportId?: string;
}

export interface ContractFileRecord {
  id: string;
  vendorId: string;
  filename: string;
  sizeBytes: number;
  uploadedBy: string;
  uploadedAt: string;
  contentBase64?: string;
}

export interface EscalationRecord {
  toRole: Lens;
  byUserId: string;
  note?: string;
  escalatedAt: string;
  slackChannel: string;
  jiraKey: string;
}

// Cast JSON imports at the boundary; downstream code uses typed maps so the
// `as unknown as ...` is the only place where types come from raw JSON.
function toMap<T extends { id: string }>(items: ReadonlyArray<T>): Map<string, T> {
  return new Map(items.map((it) => [it.id, it]));
}

const vendors = toMap(vendorsRaw as unknown as Vendor[]);
const users = toMap(usersRaw as unknown as User[]);
const orgs = toMap(orgsRaw as unknown as Org[]);
const changeReports = toMap(changeReportsRaw as unknown as ChangeReport[]);
const renewals = toMap(renewalsRaw as unknown as RenewalRecord[]);
const requests = toMap(requestsRaw as unknown as IntakeRequestRecord[]);
const integrations = toMap(integrationsRaw as unknown as IntegrationRecord[]);
const customerContracts = toMap(
  customerContractsRaw as unknown as CustomerContractRecord[],
);
const policies = toMap(policiesRaw as unknown as PolicyRecord[]);

const tokens = new Map<string, string>(
  Object.entries(tokensRaw as Record<string, string>),
);

const subProcessors = new Map<string, SubProcessorVendorEntry>(
  Object.entries(
    subProcessorsRaw as unknown as Record<string, SubProcessorVendorEntry>,
  ),
);

// Runtime-only mutable side maps (escalations, comments-on-changes, etc.) start
// empty and are populated by handlers as the demo runs.
const escalations = new Map<string, EscalationRecord[]>();
const changeComments = new Map<string, RequestComment[]>();
const findingStateOverrides = new Map<string, "open" | "under-review" | "resolved">();
const reportGenerationOverrides = new Map<
  string,
  { lastGeneratedAt: string; downloadUrl: string }
>();
const vendorActivity = new Map<string, VendorEvent[]>();
const contractFiles = new Map<string, ContractFileRecord[]>();
const integrationSyncHistory = new Map<string, SyncRecord[]>();
const teamInvites = new Map<
  string,
  { id: string; email: string; role: string; invitedAt: string; status: "pending" }
>();

export interface MockStore {
  vendors: Map<string, Vendor>;
  users: Map<string, User>;
  orgs: Map<string, Org>;
  tokens: Map<string, string>;
  changeReports: Map<string, ChangeReport>;
  renewals: Map<string, RenewalRecord>;
  requests: Map<string, IntakeRequestRecord>;
  integrations: Map<string, IntegrationRecord>;
  customerContracts: Map<string, CustomerContractRecord>;
  policies: Map<string, PolicyRecord>;
  subProcessors: Map<string, SubProcessorVendorEntry>;
  escalations: Map<string, EscalationRecord[]>;
  changeComments: Map<string, RequestComment[]>;
  findingStateOverrides: Map<string, "open" | "under-review" | "resolved">;
  reportGenerationOverrides: Map<
    string,
    { lastGeneratedAt: string; downloadUrl: string }
  >;
  vendorActivity: Map<string, VendorEvent[]>;
  contractFiles: Map<string, ContractFileRecord[]>;
  integrationSyncHistory: Map<string, SyncRecord[]>;
  teamInvites: Map<
    string,
    { id: string; email: string; role: string; invitedAt: string; status: "pending" }
  >;
}

export const store: MockStore = {
  vendors,
  users,
  orgs,
  tokens,
  changeReports,
  renewals,
  requests,
  integrations,
  customerContracts,
  policies,
  subProcessors,
  escalations,
  changeComments,
  findingStateOverrides,
  reportGenerationOverrides,
  vendorActivity,
  contractFiles,
  integrationSyncHistory,
  teamInvites,
};

// Default org for the demo — single-tenant, every authenticated request resolves
// to org_acme. Real backend resolves via the token map; we mirror that here so
// auth checks still flow through tokens.json.
export const DEFAULT_ORG_ID = "org_acme";

export function vendorName(vendorId: string): string {
  return store.vendors.get(vendorId)?.name ?? vendorId.replace(/^vnd_/, "");
}

export function userEmail(userId: string): string {
  return store.users.get(userId)?.email ?? `${userId}@acme.dev`;
}

// Re-export Renewal so handlers can refer to the shared type alongside
// RenewalRecord without importing from @unsyphn/shared directly.
export type { Renewal };
