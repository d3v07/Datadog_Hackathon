/**
 * Verify the unsyphn sidecar live.js patches the FleetStats counters from a
 * /v1/dashboard/summary response without touching any JSX file.
 *
 * Loads live.js as CommonJS (it exposes module.exports under that branch) and
 * exercises the pure helpers + the DOM-patching path against a jsdom-rendered
 * approximation of the FleetStats markup from shared.jsx.
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, beforeEach } from "vitest";
import { JSDOM } from "jsdom";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const LIVE_PATH = join(ROOT, "public", "app", "live.js");

interface LiveModule {
  applySummary: (summary: unknown) => number;
  compactUsd: (value: number | null | undefined) => string | null;
  findStatByLabel: (label: string) => Element | null;
}

function loadLive(documentRef: Document, windowRef: Window): LiveModule {
  // The IIFE in live.js looks at `document` + `window` globals. Stub them onto
  // a vm-style sandbox using node's module + jsdom — we wrap the source and
  // evaluate in a Function scope that gets the jsdom globals we want.
  const src = readFileSync(LIVE_PATH, "utf8");
  const sandbox = {
    document: documentRef,
    window: windowRef,
    fetch: (windowRef as unknown as { fetch?: typeof fetch }).fetch,
    setTimeout,
    clearTimeout,
    module: { exports: {} as LiveModule },
    console,
  };
  const wrapped = new Function(
    "document",
    "window",
    "fetch",
    "setTimeout",
    "clearTimeout",
    "module",
    "console",
    src,
  );
  wrapped(
    sandbox.document,
    sandbox.window,
    sandbox.fetch,
    sandbox.setTimeout,
    sandbox.clearTimeout,
    sandbox.module,
    sandbox.console,
  );
  return sandbox.module.exports;
}

const fleetMarkup = `
  <div class="fleet">
    <div class="stat aqua"><div class="stat-head"><span class="stat-label">Vendors</span></div><div class="stat-val">27</div><div class="stat-sub">↑ 2 added this Q</div></div>
    <div class="stat bondi"><div class="stat-head"><span class="stat-label">Scanning</span></div><div class="stat-val">8</div><div class="stat-sub">↑ live polling now</div></div>
    <div class="stat strawberry"><div class="stat-head"><span class="stat-label">P1 · critical</span></div><div class="stat-val">3</div><div class="stat-sub">↑ $42k at risk</div></div>
  </div>
`;

describe("unsyphn sidecar live.js", () => {
  let dom: JSDOM;
  let live: LiveModule;

  beforeEach(() => {
    dom = new JSDOM(`<!doctype html><html><body>${fleetMarkup}</body></html>`);
    live = loadLive(dom.window.document, dom.window as unknown as Window);
  });

  it("compactUsd formats millions, thousands, and small numbers", () => {
    expect(live.compactUsd(2_400_000)).toBe("$2.4M");
    expect(live.compactUsd(158_000)).toBe("$158k");
    expect(live.compactUsd(42)).toBe("$42");
    expect(live.compactUsd(null)).toBeNull();
    expect(live.compactUsd(NaN as unknown as number)).toBeNull();
  });

  it("findStatByLabel matches by trimmed, case-insensitive label text", () => {
    const v = live.findStatByLabel("vendors");
    expect(v).not.toBeNull();
    expect(v?.querySelector(".stat-val")?.textContent).toBe("27");
  });

  it("applySummary patches the Vendors and P1 cards from a real summary shape", () => {
    const patched = live.applySummary({
      vendorCount: 42,
      annualRunRateUsd: 2_400_000,
      savedThisQuarterUsd: 7_100,
      openChangeCount: 9,
      nextRenewal: null,
    });
    expect(patched).toBe(2);

    const vendors = live.findStatByLabel("Vendors")!;
    expect(vendors.querySelector(".stat-val")?.textContent).toBe("42");
    expect(vendors.querySelector(".stat-sub")?.textContent).toBe("live · $2.4M run-rate");
    expect(vendors.getAttribute("data-live")).toBe("1");

    const p1 = live.findStatByLabel("P1 · critical")!;
    expect(p1.querySelector(".stat-val")?.textContent).toBe("9");
    expect(p1.getAttribute("data-live")).toBe("1");
  });

  it("applySummary silently no-ops when summary is missing or malformed", () => {
    expect(live.applySummary(null)).toBe(0);
    expect(live.applySummary(undefined)).toBe(0);
    expect(live.applySummary("not an object")).toBe(0);
    // unchanged DOM
    expect(live.findStatByLabel("Vendors")?.querySelector(".stat-val")?.textContent).toBe("27");
  });

  it("applySummary leaves untargeted cards alone", () => {
    live.applySummary({ vendorCount: 42, openChangeCount: 9 });
    expect(live.findStatByLabel("Scanning")?.querySelector(".stat-val")?.textContent).toBe("8");
    expect(live.findStatByLabel("Scanning")?.getAttribute("data-live")).toBeNull();
  });
});
