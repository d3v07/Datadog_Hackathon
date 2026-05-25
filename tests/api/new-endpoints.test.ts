import { describe, it, expect, beforeEach } from "vitest";
import { resolve } from "node:path";
import { buildApp } from "../../apps/api/src/server.js";
import { loadSeeds, getSeededChangeReports } from "../../apps/api/src/seed/loader.js";

const BEARER = "Bearer demo_token_acme_corp_2026";
const SEED_DIR = resolve(__dirname, "../../seed");

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return { Authorization: BEARER, ...extra };
}

beforeEach(() => {
  loadSeeds({ seedDir: SEED_DIR });
});

describe("GET /v1/inbox", () => {
  it("returns items array and total", async () => {
    const app = buildApp({ seedChangeReports: getSeededChangeReports() });
    const resp = await app.request("/v1/inbox", { headers: authHeaders() });
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

  it("filters by severity P1", async () => {
    const app = buildApp({ seedChangeReports: getSeededChangeReports() });
    const resp = await app.request("/v1/inbox?severity=P1", { headers: authHeaders() });
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as { items: Array<{ severity: string }>; total: number };
    expect(body.items.length).toBeGreaterThan(0);
    for (const item of body.items) {
      expect(item.severity).toBe("P1");
    }
  });
});

describe("GET /v1/renewals", () => {
  it("returns renewals within the requested window", async () => {
    const app = buildApp({ seedChangeReports: getSeededChangeReports() });
    const resp = await app.request("/v1/renewals?days=30", { headers: authHeaders() });
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as { renewals: Array<{ daysOut: number }> };
    expect(Array.isArray(body.renewals)).toBe(true);
    for (const r of body.renewals) {
      expect(r.daysOut).toBeLessThanOrEqual(30);
    }
  });

  it("exposes ownerId, declined/autoRenewed flags and lensTags", async () => {
    const app = buildApp({ seedChangeReports: getSeededChangeReports() });
    const resp = await app.request("/v1/renewals?days=365", { headers: authHeaders() });
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as {
      renewals: Array<{ ownerId?: string; declined?: boolean; autoRenewed?: boolean; lensTags?: string[] }>;
    };
    expect(body.renewals.length).toBeGreaterThan(0);
    const first = body.renewals[0]!;
    expect(typeof first.ownerId).toBe("string");
    expect(first.declined).toBe(false);
    expect(first.autoRenewed).toBe(false);
    expect(Array.isArray(first.lensTags)).toBe(true);
  });
});

describe("PATCH /v1/renewals/:id", () => {
  it("updates ownerId for renewals in the calling org", async () => {
    const app = buildApp({ seedChangeReports: getSeededChangeReports() });
    const resp = await app.request("/v1/renewals/ren_salesforce", {
      method: "PATCH",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ ownerId: "usr_priya" }),
    });
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as { renewal: { id: string; ownerId: string } };
    expect(body.renewal.id).toBe("ren_salesforce");
    expect(body.renewal.ownerId).toBe("usr_priya");
  });

  it("marks declined and supports re-open", async () => {
    const app = buildApp({ seedChangeReports: getSeededChangeReports() });
    const declined = await app.request("/v1/renewals/ren_figma", {
      method: "PATCH",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ declined: true }),
    });
    expect(declined.status).toBe(200);
    const a = (await declined.json()) as { renewal: { declined: boolean } };
    expect(a.renewal.declined).toBe(true);

    const reopened = await app.request("/v1/renewals/ren_figma", {
      method: "PATCH",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ declined: false, autoRenewed: false }),
    });
    expect(reopened.status).toBe(200);
    const b = (await reopened.json()) as { renewal: { declined: boolean; autoRenewed: boolean } };
    expect(b.renewal.declined).toBe(false);
    expect(b.renewal.autoRenewed).toBe(false);
  });

  it("rejects ownerId outside the calling org", async () => {
    const app = buildApp({ seedChangeReports: getSeededChangeReports() });
    const resp = await app.request("/v1/renewals/ren_slack", {
      method: "PATCH",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ ownerId: "usr_does_not_exist" }),
    });
    expect(resp.status).toBe(422);
  });

  it("returns 404 for an unknown id", async () => {
    const app = buildApp({ seedChangeReports: getSeededChangeReports() });
    const resp = await app.request("/v1/renewals/ren_nope", {
      method: "PATCH",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ column: "sign" }),
    });
    expect(resp.status).toBe(404);
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
