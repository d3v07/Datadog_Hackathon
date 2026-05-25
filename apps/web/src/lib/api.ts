import type {
  ApiErrorEnvelope,
  EvidenceBriefResponse,
  Vendor,
  VendorCreateBody,
  VendorCreateResponse,
} from "@unsyphn/shared";

// Hardcoded for the hackathon — one seeded org, one bearer token. Production
// would source this from a session cookie or login flow.
export const DEMO_BEARER_TOKEN = "demo_token_acme_corp_2026";

export class ApiError extends Error {
  public override readonly name = "ApiError";
  public readonly status: number;
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(status: number, envelope: ApiErrorEnvelope) {
    super(envelope.error.message);
    this.status = status;
    this.code = envelope.error.code;
    if (envelope.error.details) this.details = envelope.error.details;
  }
}

async function request<T>(
  path: string,
  init: RequestInit & { skipAuth?: boolean } = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (!init.skipAuth) {
    headers.set("Authorization", `Bearer ${DEMO_BEARER_TOKEN}`);
  }
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const resp = await fetch(path, { ...init, headers });
  const text = await resp.text();
  const json = text ? (JSON.parse(text) as unknown) : undefined;

  if (!resp.ok) {
    const envelope = json as ApiErrorEnvelope | undefined;
    if (envelope && envelope.error) {
      throw new ApiError(resp.status, envelope);
    }
    throw new ApiError(resp.status, {
      error: {
        code: "internal",
        message: `Request failed with ${resp.status}`,
      },
    });
  }
  return json as T;
}

// Issue #2 — Add Vendor.
export function createVendor(
  body: VendorCreateBody,
): Promise<VendorCreateResponse> {
  return request<VendorCreateResponse>("/v1/vendors", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// Issue #3 — Billing.

export interface BillingProduct {
  id: string;
  name: string;
  description: string;
  priceUsdCents: number;
  currency: string;
  billing: "one-time" | "subscription";
  features: string[];
}

export interface BillingProductsResponse {
  data: BillingProduct[];
  orgEntitlements: { compliancePack: boolean };
}

export interface AppliedCoupon {
  code: string;
  percentOff: number;
  label: string;
}

export interface PaymentIntentResponse {
  paymentIntentId: string;
  clientSecret: string;
  amountUsdCents: number;
  originalAmountUsdCents?: number;
  currency: string;
  publishableKey: string;
  coupon?: AppliedCoupon;
}

export interface PaymentIntentRequest {
  sku: string;
  coupon?: string;
  addOns?: string[];
}

export function getBillingProducts(): Promise<BillingProductsResponse> {
  return request<BillingProductsResponse>("/v1/billing/products");
}

export function createPaymentIntent(
  body: PaymentIntentRequest | string,
): Promise<PaymentIntentResponse> {
  const payload: PaymentIntentRequest =
    typeof body === "string" ? { sku: body } : body;
  return request<PaymentIntentResponse>("/v1/billing/payment-intents", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function validateCoupon(code: string): Promise<AppliedCoupon> {
  return request<AppliedCoupon>(
    `/v1/billing/coupons/${encodeURIComponent(code)}`,
  );
}

export interface BillingInvoice {
  id: string;
  period: string;
  amountUsdCents: number;
  status: string;
  issuedAt: string;
  pdfUrl: string;
}

export function listInvoices(): Promise<{ invoices: BillingInvoice[] }> {
  return request<{ invoices: BillingInvoice[] }>("/v1/billing/invoices");
}

// Runbook F5 — dev-only fallback path. Server returns 404 in production.
export function simulateSuccess(): Promise<{ ok: true; paymentIntentId: string }> {
  return request("/v1/billing/simulate-success", { method: "POST" });
}

// Phase 3 — Portfolio.
export interface VendorsListResponse {
  vendors: Vendor[];
}

export function listVendors(lens?: string): Promise<VendorsListResponse> {
  const qs = lens ? `?lens=${encodeURIComponent(lens)}` : "";
  return request<VendorsListResponse>(`/v1/vendors${qs}`);
}

export interface VendorPatch {
  ownerId?: string;
  tier?: 1 | 2 | 3;
  posture?: "ok" | "watch" | "risk";
}

export function patchVendor(id: string, patch: VendorPatch): Promise<Vendor> {
  return request<Vendor>(`/v1/vendors/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

// Phase 4 — VendorDetail.
export function getVendor(id: string): Promise<Vendor> {
  return request<Vendor>(`/v1/vendors/${encodeURIComponent(id)}`);
}

export interface ContractSummary {
  id: string;
  vendorId: string;
  filename: string;
  sizeBytes: number;
  uploadedBy: string;
  uploadedAt: string;
}

export function listVendorContracts(
  id: string,
): Promise<{ contracts: ContractSummary[] }> {
  return request<{ contracts: ContractSummary[] }>(
    `/v1/vendors/${encodeURIComponent(id)}/contracts`,
  );
}

export function uploadVendorContract(
  id: string,
  body: { filename: string; sizeBytes: number; contentBase64: string },
): Promise<ContractSummary> {
  return request<ContractSummary>(
    `/v1/vendors/${encodeURIComponent(id)}/contracts`,
    { method: "POST", body: JSON.stringify(body) },
  );
}

export interface VendorActivityEvent {
  id: string;
  kind: string;
  actor: string;
  occurredAt: string;
  title: string;
  detail?: Record<string, unknown>;
  changeReportId?: string;
}

export function getVendorActivity(
  id: string,
): Promise<{ events: VendorActivityEvent[]; latestChangeId: string | null }> {
  return request<{ events: VendorActivityEvent[]; latestChangeId: string | null }>(
    `/v1/vendors/${encodeURIComponent(id)}/activity`,
  );
}

export function triggerVendorScan(
  id: string,
): Promise<{ ok: true; triggeredAt: string }> {
  return request<{ ok: true; triggeredAt: string }>(
    `/v1/vendors/${encodeURIComponent(id)}/scan`,
    { method: "POST" },
  );
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarLetter: string;
}

export function listTeamMembers(): Promise<{ members: TeamMember[] }> {
  return request<{ members: TeamMember[] }>("/v1/team/members");
}

export interface AuditorSessionResponse {
  sessionToken: string;
  shareUrl: string;
  expiresAt: string;
}

export function createAuditorSession(body: {
  vendorIds?: string[];
  expiresInDays: number;
}): Promise<AuditorSessionResponse> {
  return request<AuditorSessionResponse>("/v1/auditor/sessions", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export interface RenegotiationPacket {
  vendorId: string;
  vendorName: string;
  currentSpend: number;
  benchmarkRange: { low: number; high: number };
  usagePct: number;
  recoverableUsd: number;
  drafts: Array<{ tone: string; subject: string; body: string }>;
  talkingPoints: string[];
}

export function getRenegotiationPacket(vendorId: string): Promise<RenegotiationPacket> {
  return request<RenegotiationPacket>(
    `/v1/vendors/${encodeURIComponent(vendorId)}/renegotiation-packet`,
    { method: "POST" },
  );
}

// Phase 9 — Findings.
export type FindingType = "change" | "compliance" | "subprocessor" | "spend" | "security";
export type FindingState = "open" | "under-review" | "resolved";

export interface Finding {
  id: string;
  type: FindingType;
  severity: "P1" | "P2" | "P3";
  title: string;
  summary: string;
  vendorId: string;
  vendorName: string;
  detectedAt: string;
  state: FindingState;
  ownerId?: string;
  sourceUrl?: string;
  lensTags: string[];
}

export interface FindingsQuery {
  type?: FindingType;
  severity?: "P1" | "P2" | "P3";
  state?: FindingState;
  lens?: string;
  vendorId?: string;
}

export function listFindings(query: FindingsQuery = {}): Promise<{ findings: Finding[] }> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  }
  const suffix = qs.toString();
  return request<{ findings: Finding[] }>(`/v1/findings${suffix ? `?${suffix}` : ""}`);
}

export function patchFindingState(
  id: string,
  state: FindingState,
): Promise<{ id: string; state: FindingState }> {
  return request<{ id: string; state: FindingState }>(
    `/v1/findings/${encodeURIComponent(id)}/state`,
    { method: "POST", body: JSON.stringify({ state }) },
  );
}

// Phase 9 — Reports.
export type ReportSchedule = "monthly" | "weekly" | "quarterly" | "on-demand";
export type ReportCategory = "risk" | "compliance" | "spend" | "operational";

export interface Report {
  id: string;
  name: string;
  description: string;
  schedule: ReportSchedule;
  category: ReportCategory;
  lastGeneratedAt?: string;
  nextRunAt?: string;
  isCompliancePack: boolean;
  downloadUrl?: string;
}

export function listReports(): Promise<{ reports: Report[] }> {
  return request<{ reports: Report[] }>("/v1/reports");
}

export function generateReport(id: string): Promise<Report> {
  return request<Report>(`/v1/reports/${encodeURIComponent(id)}/generate`, {
    method: "POST",
  });
}

// Issue #4 — public evidence brief. No bearer (the brief is public per
// handoff/API §07 F4). The user-facing URL is /evidence/:id (SPA route);
// the JSON endpoint lives under /v1/evidence so the dev proxy can route it
// without conflicting with the SPA's history fallback.
export function getEvidence(id: string): Promise<EvidenceBriefResponse> {
  return request<EvidenceBriefResponse>(`/v1/evidence/${encodeURIComponent(id)}`, {
    skipAuth: true,
  });
}
