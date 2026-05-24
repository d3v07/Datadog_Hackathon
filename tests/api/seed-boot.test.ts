import { describe, it, expect, beforeEach } from "vitest";
import { resolve } from "node:path";
import { buildApp } from "../../apps/api/src/server.js";
import {
  loadSeeds,
  getSeededChangeReports,
} from "../../apps/api/src/seed/loader.js";

// Boot-path coverage for the fix in PR #11:
// loadSeeds() populates the legacy ChangeReportStore; buildApp() must
// hydrate the canonical ChangeReportRepository from the same data so
// lifecycle endpoints find seeded ids instead of returning 404.
//
// Without this test, the regression Copilot flagged (lifecycle 404 on
// every seeded change) could reappear silently.

const BEARER = "Bearer demo_token_acme_corp_2026";
const SEED_DIR = resolve(__dirname, "../../seed");
const SEED_CHANGE_ID = "chg_seed_notion";

beforeEach(() => {
  loadSeeds({ seedDir: SEED_DIR });
});

describe("seed boot path hydrates ChangeReportRepository", () => {
  it("acknowledge succeeds on a seeded change id", async () => {
    const app = buildApp({ seedChangeReports: getSeededChangeReports() });

    const res = await app.request(`/v1/changes/${SEED_CHANGE_ID}/acknowledge`, {
      method: "POST",
      headers: { Authorization: BEARER, "Content-Type": "application/json" },
      body: JSON.stringify({ note: "Reviewed by vendor owner" }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string; state: string; acknowledgedAt: string };
    expect(body.id).toBe(SEED_CHANGE_ID);
    expect(body.state).toBe("acknowledged");
    expect(body.acknowledgedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("returns 404 when seed reports are NOT hydrated (regression guard)", async () => {
    // Empty repo must 404 (not 500). buildApp() now auto-hydrates from
    // getSeededChangeReports(), so we pass an explicit empty array to
    // simulate the pre-hydration path.
    const app = buildApp({ seedChangeReports: [] });

    const res = await app.request(`/v1/changes/${SEED_CHANGE_ID}/acknowledge`, {
      method: "POST",
      headers: { Authorization: BEARER, "Content-Type": "application/json" },
      body: JSON.stringify({ note: "test" }),
    });

    expect(res.status).toBe(404);
  });

  it("getSeededChangeReports exposes the parsed seed contents", () => {
    const reports = getSeededChangeReports();
    expect(reports.length).toBeGreaterThan(0);
    expect(reports.some((r) => r.id === SEED_CHANGE_ID)).toBe(true);
  });
});
