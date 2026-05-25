import type {
  ApiErrorEnvelope,
  EvidenceBriefResponse,
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

export interface PaymentIntentResponse {
  paymentIntentId: string;
  clientSecret: string;
  amountUsdCents: number;
  currency: string;
  publishableKey: string;
}

export function getBillingProducts(): Promise<BillingProductsResponse> {
  return request<BillingProductsResponse>("/v1/billing/products");
}

export function createPaymentIntent(sku: string): Promise<PaymentIntentResponse> {
  return request<PaymentIntentResponse>("/v1/billing/payment-intents", {
    method: "POST",
    body: JSON.stringify({ sku }),
  });
}

// Runbook F5 — dev-only fallback path. Server returns 404 in production.
export function simulateSuccess(): Promise<{ ok: true; paymentIntentId: string }> {
  return request("/v1/billing/simulate-success", { method: "POST" });
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
