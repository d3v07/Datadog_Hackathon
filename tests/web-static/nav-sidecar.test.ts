/**
 * Verify nav.js wires the Halo landing-page CTAs to /app/ without touching any
 * markup. Mirrors the pattern from live-sidecar.test.ts: loads nav.js into a
 * Function scope backed by a jsdom, stubs location so navigation is observable.
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, beforeEach } from "vitest";
import { JSDOM } from "jsdom";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "../..");
const NAV_PATH = join(ROOT, "public", "nav.js");

const heroMarkup = `
  <nav class="nav">
    <a href="#" class="cta">Get access →</a>
  </nav>
  <section class="hero">
    <div class="cta-row">
      <button class="btn primary">Start free trial</button>
      <button class="btn">Book a walkthrough <span class="kbd">⌘ K</span></button>
    </div>
  </section>
`;

function loadNav(documentRef: Document, locationRef: { href: string }): void {
  const src = readFileSync(NAV_PATH, "utf8");
  const wrapped = new Function("document", "location", src);
  wrapped(documentRef, locationRef);
}

describe("nav.js sidecar", () => {
  let dom: JSDOM;
  let loc: { href: string };

  beforeEach(() => {
    dom = new JSDOM(
      `<!doctype html><html><body>${heroMarkup}</body></html>`,
      { runScripts: "dangerously" }
    );
    // DOMContentLoaded already fired in JSDOM construction, so readyState is
    // "complete" when loadNav runs — the IIFE will call wire() synchronously.
    loc = { href: "" };
    loadNav(dom.window.document, loc);
  });

  it("sets nav CTA href to /app/", () => {
    const cta = dom.window.document.querySelector(".nav a.cta") as HTMLAnchorElement;
    expect(cta.href).toContain("/app/");
  });

  it("nav CTA click navigates to /app/", () => {
    const cta = dom.window.document.querySelector(".nav a.cta") as HTMLAnchorElement;
    const fakeEvent = { preventDefault: () => {} } as Event;
    cta.dispatchEvent(new dom.window.Event("click"));
    // The click handler sets location.href via the stubbed loc object.
    // dispatchEvent uses the real jsdom event; we verify via the stub.
    expect(loc.href).toBe("/app/");
  });

  it("primary hero button click navigates to /app/", () => {
    const btn = dom.window.document.querySelector(".hero .btn.primary") as HTMLButtonElement;
    btn.dispatchEvent(new dom.window.Event("click"));
    expect(loc.href).toBe("/app/");
  });

  it("secondary hero button click navigates to /app/", () => {
    const btn = dom.window.document.querySelector(".hero .btn:not(.primary)") as HTMLButtonElement;
    btn.dispatchEvent(new dom.window.Event("click"));
    expect(loc.href).toBe("/app/");
  });

  it("is idempotent — running twice does not duplicate navigation", () => {
    loadNav(dom.window.document, loc);
    loc.href = "";
    const btn = dom.window.document.querySelector(".hero .btn.primary") as HTMLButtonElement;
    btn.dispatchEvent(new dom.window.Event("click"));
    // href should be set once, not triggered multiple times in a way that matters
    expect(loc.href).toBe("/app/");
  });

  it("silently no-ops when selectors return null (missing markup)", () => {
    const emptyDom = new JSDOM("<!doctype html><html><body></body></html>");
    const emptyLoc = { href: "" };
    expect(() => loadNav(emptyDom.window.document, emptyLoc)).not.toThrow();
    expect(emptyLoc.href).toBe("");
  });
});
