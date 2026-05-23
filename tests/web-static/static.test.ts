import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const ROOT = join(__dirname, "../..");
const PUBLIC = join(ROOT, "public");
const APP = join(PUBLIC, "app");

const EXPECTED_JSX_SCRIPTS = [
  "browser-window.jsx",
  "brand.jsx",
  "shared.jsx",
  "screen-portfolio.jsx",
  "screen-change.jsx",
  "escalate.jsx",
  "routing.jsx",
  "screen-evidence.jsx",
  "app.jsx",
];

describe("static frontend delivery", () => {
  it("public/index.html exists and is > 1000 bytes", () => {
    const path = join(PUBLIC, "index.html");
    expect(existsSync(path)).toBe(true);
    expect(statSync(path).size).toBeGreaterThan(1000);
  });

  it('public/index.html contains brand text "UNSYPHN"', () => {
    const content = readFileSync(join(PUBLIC, "index.html"), "utf8");
    expect(content).toContain("UNSYPHN");
  });

  it("public/index.html routes primary Halo CTAs to /app/", () => {
    const content = readFileSync(join(PUBLIC, "index.html"), "utf8");
    expect(content).toContain('<a href="/app/" class="cta">Get access →</a>');
    expect(content).toContain('<button class="btn primary" onclick="location.href=\'/app/\'">Start free trial</button>');
  });

  it("public/app/index.html exists", () => {
    expect(existsSync(join(APP, "index.html"))).toBe(true);
  });

  it("public/app/index.html contains all 9 expected JSX script tags", () => {
    const content = readFileSync(join(APP, "index.html"), "utf8");
    for (const script of EXPECTED_JSX_SCRIPTS) {
      expect(content, `missing script tag for ${script}`).toContain(
        `<script type="text/babel" src="${script}">`
      );
    }
  });

  it("every JSX src referenced in public/app/index.html resolves to an existing file", () => {
    const content = readFileSync(join(APP, "index.html"), "utf8");
    const srcRe = /<script[^>]+type="text\/babel"[^>]+src="([^"]+\.jsx)"[^>]*>/g;
    const found: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = srcRe.exec(content)) !== null) {
      found.push(m[1]);
    }
    expect(found.length).toBeGreaterThan(0);
    for (const src of found) {
      expect(existsSync(join(APP, src)), `${src} referenced but missing from public/app/`).toBe(true);
    }
  });

  it("public/app/index.html references tokens.css and app.css", () => {
    const content = readFileSync(join(APP, "index.html"), "utf8");
    expect(content).toContain("tokens.css");
    expect(content).toContain("app.css");
  });

  it("tokens.css exists in public/app/", () => {
    expect(existsSync(join(APP, "tokens.css"))).toBe(true);
  });

  it("app.css exists in public/app/", () => {
    expect(existsSync(join(APP, "app.css"))).toBe(true);
  });

  it('vercel.json exists at repo root and has outputDirectory "public"', () => {
    const path = join(ROOT, "vercel.json");
    expect(existsSync(path)).toBe(true);
    const json = JSON.parse(readFileSync(path, "utf8"));
    expect(json.outputDirectory).toBe("public");
  });

  it("vercel.json redirects /app to /app/ so relative static assets resolve", () => {
    const json = JSON.parse(readFileSync(join(ROOT, "vercel.json"), "utf8"));
    expect(json.redirects).toContainEqual({
      source: "/app",
      destination: "/app/",
      permanent: false,
    });
  });

  it("vercel.json rewrites only /app/* deep links and never shadows /v1/*", () => {
    const json = JSON.parse(readFileSync(join(ROOT, "vercel.json"), "utf8"));
    expect(json.rewrites).toContainEqual({
      source: "/app/:path*",
      destination: "/app/",
    });
    expect(json.rewrites).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: "/(.*)" }),
        expect.objectContaining({ source: "/:path*" }),
        expect.objectContaining({ source: "/v1/:path*" }),
      ]),
    );
  });
});
