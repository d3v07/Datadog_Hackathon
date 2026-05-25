import { describe, it, expect } from "vitest";
import { buildApp } from "../../apps/api/src/server.js";

const BEARER = "Bearer demo_token_acme_corp_2026";

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return { Authorization: BEARER, ...extra };
}

describe("GET /v1/inbox", () => {
  it("returns items array and total", async () => {
    const resp = await buildApp().request("/v1/inbox", { headers: authHeaders() });
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as { items: unknown[]; total: number };
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.items.length).toBeGreaterThan(0);
    expect(typeof body.total).toBe("number");
    const first = body.items[0] as Record<string, unknown>;
    expect(first.id).toBeDefined();
    expect(first.kind).toBeDefined();
    expect(first.vendorName).toBeDefined();
    expect(first.severity).toBeDefined();
    expect(first.lensTags).toBeDefined();
  });

  it("returns only renewal items when filter=renewals", async () => {
    const resp = await buildApp().request("/v1/inbox?filter=renewals", { headers: authHeaders() });
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as { items: Array<{ kind: string }>; total: number };
    expect(body.items.length).toBeGreaterThan(0);
    for (const item of body.items) {
      expect(item.kind).toBe("renewal");
    }
  });
});

describe("GET /v1/renewals", () => {
  it("returns renewals within the requested window", async () => {
    const resp = await buildApp().request("/v1/renewals?days=30", { headers: authHeaders() });
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as { renewals: Array<{ daysOut: number }> };
    expect(Array.isArray(body.renewals)).toBe(true);
    for (const r of body.renewals) {
      expect(r.daysOut).toBeLessThanOrEqual(30);
    }
  });
});

describe("GET /v1/recoverable", () => {
  it("returns totalUsd and breakdown with four keys", async () => {
    const resp = await buildApp().request("/v1/recoverable", { headers: authHeaders() });
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as {
      totalUsd: number;
      breakdown: { unusedSeatsUsd: number; priceHikesUsd: number; duplicateAppsUsd: number; atRiskUsd: number };
    };
    expect(typeof body.totalUsd).toBe("number");
    expect(body.totalUsd).toBe(135000);
    expect(typeof body.breakdown.unusedSeatsUsd).toBe("number");
    expect(typeof body.breakdown.priceHikesUsd).toBe("number");
    expect(typeof body.breakdown.duplicateAppsUsd).toBe("number");
    expect(typeof body.breakdown.atRiskUsd).toBe("number");
  });
});

describe("POST /v1/onboarding/discover", () => {
  it("returns jobId and discoveredVendors array", async () => {
    const resp = await buildApp().request("/v1/onboarding/discover", {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ provider: "google", domain: "acme.com" }),
    });
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as {
      jobId: string;
      estimatedSeconds: number;
      expectedVendors: number;
      discoveredVendors: unknown[];
    };
    expect(body.jobId).toBe("job_demo_001");
    expect(typeof body.estimatedSeconds).toBe("number");
    expect(typeof body.expectedVendors).toBe("number");
    expect(Array.isArray(body.discoveredVendors)).toBe(true);
    expect(body.discoveredVendors.length).toBeGreaterThan(0);
  });
});
