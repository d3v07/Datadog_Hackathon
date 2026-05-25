import { describe, it, expect, beforeEach } from "vitest";
import { resolve } from "node:path";
import { buildApp } from "../../apps/api/src/server.js";
import { loadSeeds } from "../../apps/api/src/seed/loader.js";
import { setRunStore } from "../../apps/api/src/db/run-store.js";
import { setVendorsRouteOverrides } from "../../apps/api/src/routes/vendors.js";
import { vendorStore } from "../../apps/api/src/db/vendor-store.js";
import { bus, type BusEnvelope } from "../../apps/api/src/lib/bus.js";
import { InMemoryRunStore } from "../helpers/in-memory-run-store.js";

const BEARER = "Bearer demo_token_acme_corp_2026";
const SEED_DIR = resolve(__dirname, "../../seed");

function acceptAll() {
  return async () => ({ ok: true, status: 200 });
}

function acceptOnly(paths: Set<string>) {
  return async (url: string) => {
    const u = new URL(url);
    return { ok: paths.has(u.pathname), status: paths.has(u.pathname) ? 200 : 404 };
  };
}

let runs: InMemoryRunStore;
let captured: BusEnvelope[];
let unsub: () => void;

beforeEach(() => {
  loadSeeds({ seedDir: SEED_DIR });
  runs = new InMemoryRunStore();
  setRunStore(runs);
  setVendorsRouteOverrides({
    discovery: { fetcher: acceptAll() },
    stubRunner: { stageDelayMs: 0 },
  });
  captured = [];
  unsub = bus.subscribe("org_acme", (env) => captured.push(env));
  return () => {
    unsub();
  };
});

function postVendor(body: unknown, opts: { auth?: boolean } = { auth: true }) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.auth !== false) headers.Authorization = BEARER;
  return buildApp().request("/v1/vendors", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

describe("POST /v1/vendors", () => {
  it("rejects unauthenticated requests with 401", async () => {
    const resp = await postVendor({}, { auth: false });
    expect(resp.status).toBe(401);
    const body = (await resp.json()) as { error: { code: string } };
    expect(body.error.code).toBe("unauthenticated");
  });

  it("rejects invalid bodies with 400 validation-failed", async () => {
    const resp = await postVendor({ name: "X" });
    expect(resp.status).toBe(400);
    const body = (await resp.json()) as { error: { code: string } };
    expect(body.error.code).toBe("validation-failed");
  });

  it("rejects an unknown ownerId with 422", async () => {
    const resp = await postVendor({
      name: "PagerDuty",
      homepageUrl: "https://pagerduty.test",
      ownerId: "usr_nobody",
      tier: 2,
    });
    expect(resp.status).toBe(422);
    const body = (await resp.json()) as { error: { code: string } };
    expect(body.error.code).toBe("unprocessable");
  });

  it("creates a vendor and queues a first scan with discoverable URLs", async () => {
    const resp = await postVendor({
      name: "PagerDuty",
      homepageUrl: "https://pagerduty.test",
      ownerId: "usr_priya",
      tier: 2,
      dataClasses: ["pii"],
    });
    expect(resp.status).toBe(201);
    const body = (await resp.json()) as {
      id: string;
      name: string;
      firstScanRunId: string;
      discoveredUrls: Record<string, string>;
    };
    expect(body.name).toBe("PagerDuty");
    expect(body.id).toMatch(/^vnd_/);
    expect(body.firstScanRunId).toMatch(/^run_/);
    expect(body.discoveredUrls.terms).toBe("https://pagerduty.test/terms");
    expect(body.discoveredUrls.pricing).toBe("https://pagerduty.test/pricing");
    expect(body.discoveredUrls.dpa).toBe("https://pagerduty.test/dpa");
    expect(body.discoveredUrls.subProcessors).toBe(
      "https://pagerduty.test/subprocessors",
    );
    expect(body.discoveredUrls.security).toBe("https://pagerduty.test/security");
    expect(body.discoveredUrls.sla).toBe("https://pagerduty.test/sla");

    // agent_runs row written
    const stored = await runs.getById(body.firstScanRunId);
    expect(stored).toBeDefined();
    expect(stored?.trigger).toBe("first-scan");

    // Wait for the async stub-runner to finish (stageDelayMs=0).
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));

    const events = captured.map((e) => e.payload.event);
    expect(events).toContain("scheduler.tick");
    expect(events).toContain("run.stage");
    expect(events).toContain("run.completed");

    // Final state on the run row is "unchanged".
    const final = await runs.getById(body.firstScanRunId);
    expect(final?.status).toBe("unchanged");
    expect(final?.endedAt).toBeDefined();

    // Vendor is in the store and findable by normalized homepage.
    const stored2 = vendorStore.findByHomepage("org_acme", "https://pagerduty.test");
    expect(stored2?.id).toBe(body.id);
  });

  it("returns 422 discovery-incomplete when paths cannot be discovered", async () => {
    setVendorsRouteOverrides({
      discovery: { fetcher: acceptOnly(new Set(["/terms", "/pricing"])) },
      stubRunner: { stageDelayMs: 0 },
    });
    const resp = await postVendor({
      name: "Hollow",
      homepageUrl: "https://hollow.test",
      ownerId: "usr_priya",
      tier: 3,
    });
    expect(resp.status).toBe(422);
    const body = (await resp.json()) as {
      error: { code: string; details: { missing: string[] } };
    };
    expect(body.error.code).toBe("discovery-incomplete");
    expect(body.error.details.missing.sort()).toEqual(
      ["dpa", "security", "sla", "subProcessors"].sort(),
    );
  });

  it("returns 409 duplicate when the same normalized homepage already exists", async () => {
    const first = await postVendor({
      name: "First",
      homepageUrl: "https://dup.test",
      ownerId: "usr_priya",
      tier: 2,
    });
    expect(first.status).toBe(201);

    const second = await postVendor({
      name: "Second",
      homepageUrl: "https://www.dup.test/",
      ownerId: "usr_priya",
      tier: 2,
    });
    expect(second.status).toBe(409);
    const body = (await second.json()) as { error: { code: string } };
    expect(body.error.code).toBe("duplicate");
  });
});

describe("GET /v1/vendors/:id", () => {
  it("returns the seeded vendor", async () => {
    const resp = await buildApp().request("/v1/vendors/vnd_notion", {
      headers: { Authorization: BEARER },
    });
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as { id: string; name: string };
    expect(body.id).toBe("vnd_notion");
    expect(body.name).toBe("Notion");
  });

  it("returns 404 for an unknown id", async () => {
    const resp = await buildApp().request("/v1/vendors/vnd_unknown", {
      headers: { Authorization: BEARER },
    });
    expect(resp.status).toBe(404);
  });

  it("returns 401 without bearer", async () => {
    const resp = await buildApp().request("/v1/vendors/vnd_notion");
    expect(resp.status).toBe(401);
  });
});

describe("PATCH /v1/vendors/:id activity recording", () => {
  it("records an event and surfaces it on the activity timeline", async () => {
    const app = buildApp();
    const patchResp = await app.request("/v1/vendors/vnd_notion", {
      method: "PATCH",
      headers: { Authorization: BEARER, "Content-Type": "application/json" },
      body: JSON.stringify({ posture: "watch" }),
    });
    expect(patchResp.status).toBe(200);

    const activityResp = await app.request("/v1/vendors/vnd_notion/activity", {
      headers: { Authorization: BEARER },
    });
    expect(activityResp.status).toBe(200);
    const body = (await activityResp.json()) as {
      events: Array<{ kind: string; title: string }>;
    };
    const patchEvent = body.events.find((e) => e.kind === "vendor.patch");
    expect(patchEvent).toBeDefined();
    expect(patchEvent?.title).toMatch(/posture/);
  });
});

describe("POST /v1/vendors/:id/contracts", () => {
  it("uploads then lists a contract", async () => {
    const app = buildApp();
    const uploadResp = await app.request("/v1/vendors/vnd_notion/contracts", {
      method: "POST",
      headers: { Authorization: BEARER, "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: "MSA-Notion-2026.pdf",
        sizeBytes: 1024,
        contentBase64: "aGVsbG8=",
      }),
    });
    expect(uploadResp.status).toBe(201);
    const upload = (await uploadResp.json()) as { id: string; filename: string };
    expect(upload.filename).toBe("MSA-Notion-2026.pdf");

    const listResp = await app.request("/v1/vendors/vnd_notion/contracts", {
      headers: { Authorization: BEARER },
    });
    const list = (await listResp.json()) as { contracts: Array<{ id: string }> };
    expect(list.contracts.some((c) => c.id === upload.id)).toBe(true);
  });

  it("rejects an oversized upload with 422", async () => {
    const resp = await buildApp().request("/v1/vendors/vnd_notion/contracts", {
      method: "POST",
      headers: { Authorization: BEARER, "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: "huge.pdf",
        sizeBytes: 100_000_000,
        contentBase64: "aGVsbG8=",
      }),
    });
    expect(resp.status).toBe(422);
  });
});
