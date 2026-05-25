import { describe, it, expect, beforeEach } from "vitest";
import { resolve } from "node:path";
import { buildApp } from "../../apps/api/src/server.js";
import { loadSeeds } from "../../apps/api/src/seed/loader.js";

const BEARER = "Bearer demo_token_acme_corp_2026";
const SEED_DIR = resolve(__dirname, "../../seed");

interface RequestDto {
  id: string;
  vendorName: string;
  status: "pending" | "approved" | "rejected" | "routed";
  category: string;
  comments: Array<{ id: string; text: string; authorName: string }>;
  requesterName: string;
  approverName?: string;
  routeTo?: string;
  autoEscalated: boolean;
  slaDueAt: string;
}

interface ListResponse {
  requests: RequestDto[];
}

interface SingleResponse {
  request: RequestDto;
}

beforeEach(() => {
  loadSeeds({ seedDir: SEED_DIR });
});

function authedJson(body?: unknown): { headers: Record<string, string>; body?: string; method: string } {
  return {
    method: body === undefined ? "GET" : "POST",
    headers: { Authorization: BEARER, "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  };
}

describe("GET /v1/requests", () => {
  it("rejects unauthenticated callers with 401", async () => {
    const resp = await buildApp().request("/v1/requests");
    expect(resp.status).toBe(401);
  });

  it("returns seeded requests in envelope form with denormalized names", async () => {
    const resp = await buildApp().request("/v1/requests", authedJson());
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as ListResponse;
    expect(body.requests.length).toBeGreaterThan(0);
    const linear = body.requests.find((r) => r.id === "req_linear_extra");
    expect(linear).toBeDefined();
    expect(linear?.requesterName).toBe("Devon Rao");
    expect(linear?.status).toBe("pending");
    expect(typeof linear?.autoEscalated).toBe("boolean");
    expect(linear?.slaDueAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("surfaces 'routed' status (no longer collapsed to pending)", async () => {
    const resp = await buildApp().request("/v1/requests?status=routed", authedJson());
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as ListResponse;
    expect(body.requests.length).toBeGreaterThan(0);
    expect(body.requests.every((r) => r.status === "routed")).toBe(true);
  });

  it("filters by lens — IT lens excludes analytics rows", async () => {
    const resp = await buildApp().request("/v1/requests?lens=it", authedJson());
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as ListResponse;
    // IT lens allows: infrastructure | productivity | devtools.
    expect(body.requests.every((r) => ["infrastructure", "productivity", "devtools"].includes(r.category) || r.routeTo === "it")).toBe(true);
  });

  it("procurement lens returns everything", async () => {
    const all = await buildApp().request("/v1/requests", authedJson());
    const proc = await buildApp().request("/v1/requests?lens=procurement", authedJson());
    const allBody = (await all.json()) as ListResponse;
    const procBody = (await proc.json()) as ListResponse;
    expect(procBody.requests.length).toBe(allBody.requests.length);
  });
});

describe("GET /v1/requests/:id", () => {
  it("returns one request denormalized with comments and requesterName", async () => {
    const resp = await buildApp().request("/v1/requests/req_loom", authedJson());
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as SingleResponse;
    expect(body.request.id).toBe("req_loom");
    expect(body.request.vendorName).toBe("Loom");
    expect(body.request.requesterName).toBe("Jordan Wells");
    expect(body.request.status).toBe("approved");
    expect(body.request.comments.length).toBeGreaterThan(0);
  });

  it("404s on unknown id", async () => {
    const resp = await buildApp().request("/v1/requests/req_nope", authedJson());
    expect(resp.status).toBe(404);
  });

  it("rejects unauthenticated callers with 401", async () => {
    const resp = await buildApp().request("/v1/requests/req_loom");
    expect(resp.status).toBe(401);
  });
});

describe("POST /v1/requests", () => {
  it("creates a pending request and returns the DTO with names", async () => {
    const resp = await buildApp().request(
      "/v1/requests",
      authedJson({
        vendorName: "TestCo",
        category: "devtools",
        expectedSpendUsd: 12000,
        justification: "Need monitoring for our staging env all day",
        similarTools: ["DataDog"],
      }),
    );
    expect(resp.status).toBe(201);
    const body = (await resp.json()) as SingleResponse;
    expect(body.request.status).toBe("pending");
    expect(body.request.vendorName).toBe("TestCo");
    expect(body.request.requesterName).toBe("Priya Natarajan");
    expect(body.request.autoEscalated).toBe(false);
  });

  it("rejects invalid bodies with 422", async () => {
    const resp = await buildApp().request(
      "/v1/requests",
      authedJson({ vendorName: "X" }),
    );
    expect(resp.status).toBe(422);
  });
});

describe("POST /v1/requests/:id/decision", () => {
  it("approves a pending request", async () => {
    const resp = await buildApp().request(
      "/v1/requests/req_linear_extra/decision",
      authedJson({ status: "approved", note: "Engineering velocity wins" }),
    );
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as SingleResponse;
    expect(body.request.status).toBe("approved");
    expect(body.request.approverName).toBe("Priya Natarajan");
    expect(body.request.comments.at(-1)?.text).toContain("velocity");
  });

  it("requires routeTo when routing", async () => {
    const resp = await buildApp().request(
      "/v1/requests/req_linear_extra/decision",
      authedJson({ status: "routed" }),
    );
    expect(resp.status).toBe(422);
  });

  it("routes to a target and persists routeTo on the record", async () => {
    const resp = await buildApp().request(
      "/v1/requests/req_linear_extra/decision",
      authedJson({ status: "routed", routeTo: "legal", note: "MSA review" }),
    );
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as SingleResponse;
    expect(body.request.status).toBe("routed");
    expect(body.request.routeTo).toBe("legal");
  });

  it("re-opens a rejected request back to pending", async () => {
    const resp = await buildApp().request(
      "/v1/requests/req_miro/decision",
      authedJson({ status: "pending", note: "Re-open per Q3 plan" }),
    );
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as SingleResponse;
    expect(body.request.status).toBe("pending");
  });

  it("404s on unknown id", async () => {
    const resp = await buildApp().request(
      "/v1/requests/req_does_not_exist/decision",
      authedJson({ status: "approved" }),
    );
    expect(resp.status).toBe(404);
  });
});

describe("POST /v1/requests/:id/comments", () => {
  it("appends a comment with denormalized author info", async () => {
    const resp = await buildApp().request(
      "/v1/requests/req_linear_extra/comments",
      authedJson({ text: "Looping in finance" }),
    );
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as SingleResponse;
    const last = body.request.comments.at(-1);
    expect(last?.text).toBe("Looping in finance");
    expect(last?.authorName).toBe("Priya Natarajan");
  });
});
