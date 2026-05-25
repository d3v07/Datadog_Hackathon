import { describe, it, expect, beforeEach } from "vitest";
import { resolve } from "node:path";
import { buildApp } from "../../apps/api/src/server.js";
import { loadSeeds } from "../../apps/api/src/seed/loader.js";

const SEED_DIR = resolve(__dirname, "../../seed");

beforeEach(() => {
  loadSeeds({ seedDir: SEED_DIR });
});

describe("GET /evidence/:id", () => {
  it("returns the brief without requiring a bearer token", async () => {
    const resp = await buildApp().request("/v1/evidence/chg_seed_notion");
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as Record<string, unknown>;
    expect(body.changeReport).toBeDefined();
    expect(body.vendor).toBeDefined();
    expect(body.policyFired).toBeDefined();
  });

  it("returns 404 with the standard error envelope for an unknown id", async () => {
    const resp = await buildApp().request("/v1/evidence/chg_does_not_exist");
    expect(resp.status).toBe(404);
    const body = (await resp.json()) as { error: { code: string } };
    expect(body.error.code).toBe("not-found");
  });

  it("denormalises vendor and policy by id and includes citations verbatim", async () => {
    const resp = await buildApp().request("/v1/evidence/chg_seed_notion");
    const body = (await resp.json()) as {
      changeReport: {
        id: string;
        severity: string;
        changes: Array<{
          summary: string;
          citations: Array<{ quote: string; url: string; fetchedAt: string }>;
        }>;
      };
      vendor: { id: string; name: string; category: string };
      policyFired: { id: string; name: string };
      policyAlsoMatched: Array<{ id: string; name: string }>;
      actionSummary: unknown[];
    };

    expect(body.vendor.id).toBe("vnd_notion");
    expect(body.vendor.name).toBe("Notion");
    expect(body.vendor.category).toBe("productivity");

    expect(body.policyFired.id).toBe("pol_data_retention_pii_shrink");
    expect(body.policyFired.name).toBe(
      "Data retention shrinks for PII vendors",
    );

    expect(body.policyAlsoMatched).toHaveLength(1);
    expect(body.policyAlsoMatched[0]?.name).toBe(
      "Price increase >10% within 90d of renewal",
    );

    expect(body.changeReport.severity).toBe("P1");
    expect(body.changeReport.changes.length).toBeGreaterThanOrEqual(2);
    const firstCitation = body.changeReport.changes[0]?.citations[0];
    expect(firstCitation?.quote).toContain("thirty (30) days");
    expect(firstCitation?.url).toBe("https://notion.so/terms");
    expect(firstCitation?.fetchedAt).toMatch(/^2026-/);

    // No actions seeded yet (Track A will populate via the runner).
    expect(body.actionSummary).toEqual([]);
  });

  it("works for the background fleet entry (Stripe sub-processor)", async () => {
    const resp = await buildApp().request("/v1/evidence/chg_seed_stripe_subprocessor");
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as {
      vendor: { name: string };
      policyFired: { name: string };
    };
    expect(body.vendor.name).toBe("Stripe");
    expect(body.policyFired.name).toBe(
      "Sub-processor added in non-adequate jurisdiction",
    );
  });
});

describe("GET /evidence/:id/bundle.html", () => {
  it("bundle.html endpoint returns inline-styled HTML", async () => {
    const resp = await buildApp().request("/v1/evidence/chg_seed_notion/bundle.html");
    expect(resp.status).toBe(200);
    expect(resp.headers.get("content-type")).toContain("text/html");
    const html = await resp.text();
    expect(html).toContain("UNSYPHN EVIDENCE BUNDLE");
    expect(html).toContain("Notion");
  });

  it("bundle.html returns 404 for unknown id", async () => {
    const resp = await buildApp().request("/v1/evidence/chg_does_not_exist/bundle.html");
    expect(resp.status).toBe(404);
  });
});
