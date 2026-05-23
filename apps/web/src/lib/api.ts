import type {
  ApiErrorEnvelope,
  VendorCreateBody,
  VendorCreateResponse,
} from "@redline/shared";

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
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${DEMO_BEARER_TOKEN}`);
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

// Issue #2 — Add Vendor. #3 will add createPaymentIntent and getBillingProducts
// below this export.
export function createVendor(
  body: VendorCreateBody,
): Promise<VendorCreateResponse> {
  return request<VendorCreateResponse>("/v1/vendors", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
