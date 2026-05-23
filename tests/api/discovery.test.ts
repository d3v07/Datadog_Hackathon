import { describe, it, expect } from "vitest";
import { discoverUrls } from "../../apps/api/src/lib/discovery.js";

function fetcherThatAccepts(paths: Set<string>) {
  return async (url: string) => {
    const u = new URL(url);
    return { ok: paths.has(u.pathname), status: paths.has(u.pathname) ? 200 : 404 };
  };
}

describe("discoverUrls", () => {
  it("finds all six URLs when every conventional path exists", async () => {
    const fetcher = fetcherThatAccepts(
      new Set([
        "/terms",
        "/pricing",
        "/dpa",
        "/subprocessors",
        "/security",
        "/sla",
      ]),
    );
    const result = await discoverUrls("https://acme.test", { fetcher });
    expect(result.missing).toEqual([]);
    expect(result.found).toEqual({
      terms: "https://acme.test/terms",
      pricing: "https://acme.test/pricing",
      dpa: "https://acme.test/dpa",
      subProcessors: "https://acme.test/subprocessors",
      security: "https://acme.test/security",
      sla: "https://acme.test/sla",
    });
  });

  it("falls back to alternate paths (e.g. /legal/dpa, /sub-processors)", async () => {
    const fetcher = fetcherThatAccepts(
      new Set([
        "/terms",
        "/plans",
        "/legal/dpa",
        "/sub-processors",
        "/security",
        "/legal/sla",
      ]),
    );
    const result = await discoverUrls("https://acme.test", { fetcher });
    expect(result.missing).toEqual([]);
    expect(result.found.pricing).toBe("https://acme.test/plans");
    expect(result.found.dpa).toBe("https://acme.test/legal/dpa");
    expect(result.found.subProcessors).toBe("https://acme.test/sub-processors");
    expect(result.found.sla).toBe("https://acme.test/legal/sla");
  });

  it("returns the missing keys when paths cannot be discovered", async () => {
    const fetcher = fetcherThatAccepts(new Set(["/terms", "/pricing"]));
    const result = await discoverUrls("https://acme.test", { fetcher });
    expect(result.missing.sort()).toEqual(
      ["dpa", "security", "sla", "subProcessors"].sort(),
    );
    expect(Object.keys(result.found).sort()).toEqual(["pricing", "terms"]);
  });

  it("preserves the homepage origin in the result", async () => {
    const fetcher = fetcherThatAccepts(new Set());
    const result = await discoverUrls("https://Acme.test:8443/anything", {
      fetcher,
    });
    expect(result.homepageOrigin).toBe("https://acme.test:8443");
  });
});
