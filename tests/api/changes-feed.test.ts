import { describe, it, expect } from "vitest";
import { buildApp } from "../../apps/api/src/server.js";

const AUTH = { Authorization: "Bearer demo_token_acme_corp_2026" };

describe("GET /v1/changes/feed", () => {
  it("returns all changes when no filter applied", async () => {
    const resp = await buildApp().request("/v1/changes/feed", { headers: AUTH });
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as { changes: unknown[] };
    expect(body.changes.length).toBeGreaterThanOrEqual(12);
  });

  it("filters by vendorId", async () => {
    const resp = await buildApp().request("/v1/changes/feed?vendorId=vnd_notion", { headers: AUTH });
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as { changes: Array<{ vendorId: string }> };
    expect(body.changes.length).toBeGreaterThan(0);
    expect(body.changes.every((c) => c.vendorId === "vnd_notion")).toBe(true);
  });

  it("filters by category", async () => {
    const resp = await buildApp().request("/v1/changes/feed?category=pricing", { headers: AUTH });
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as { changes: Array<{ category: string }> };
    expect(body.changes.length).toBeGreaterThan(0);
    expect(body.changes.every((c) => c.category === "pricing")).toBe(true);
  });
});
