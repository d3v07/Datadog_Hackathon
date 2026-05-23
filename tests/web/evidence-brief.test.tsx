import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { SensoBrief } from "../../apps/web/src/screens/SensoBrief.js";
import type { EvidenceBriefResponse } from "@redline/shared";

function mockFetch(handler: (path: string) => Response) {
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    const path = new URL(url, "http://test").pathname;
    return handler(path);
  }) as typeof fetch;
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const FIXTURE: EvidenceBriefResponse = {
  changeReport: {
    id: "chg_seed_notion",
    orgId: "org_acme",
    vendorId: "vnd_notion",
    runId: "run_seed_notion",
    detectedAt: "2026-05-22T18:42:18Z",
    severity: "P1",
    state: "new",
    policyFiredId: "pol_data_retention_pii_shrink",
    policyAlsoMatched: ["pol_price_hike_near_renewal"],
    changes: [
      {
        id: "d1",
        category: "data",
        summary: "User-content retention reduced from 90 to 30 days",
        before: "ninety (90) days",
        after: "thirty (30) days",
        materiality: "material",
        citations: [
          {
            url: "https://notion.so/terms",
            quote: "User content is retained for thirty (30) days after account deletion.",
            section: "§7.2 — Data Retention",
            fetchedAt: "2026-05-22T18:42:11Z",
          },
        ],
      },
    ],
    recommendation: {
      action: "renegotiate",
      copy: "Open renewal conversation; cite §7.2.",
    },
    ownerId: "usr_priya",
  },
  vendor: { id: "vnd_notion", name: "Notion", category: "productivity" },
  policyFired: {
    id: "pol_data_retention_pii_shrink",
    name: "Data retention shrinks for PII vendors",
  },
  policyAlsoMatched: [
    {
      id: "pol_price_hike_near_renewal",
      name: "Price increase >10% within 90d of renewal",
    },
  ],
  actionSummary: [],
};

beforeEach(() => {
  // Default: happy path.
  mockFetch((path) => {
    if (path === "/v1/evidence/chg_seed_notion") {
      return jsonResponse(200, FIXTURE);
    }
    if (path === "/v1/evidence/chg_missing") {
      return jsonResponse(404, {
        error: { code: "not-found", message: "No evidence brief for id chg_missing" },
      });
    }
    return jsonResponse(500, { error: { code: "internal", message: "boom" } });
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("SensoBrief", () => {
  it("renders the brief with vendor, policy, citation, and timestamp", async () => {
    render(<SensoBrief changeReportId="chg_seed_notion" />);
    expect(await screen.findByTestId("brief")).toBeInTheDocument();
    expect(screen.getByTestId("brief-title")).toHaveTextContent(/Notion/);
    expect(screen.getByTestId("brief-severity")).toHaveTextContent("P1");
    expect(screen.getByTestId("brief-policy")).toHaveTextContent(
      "Data retention shrinks for PII vendors",
    );
    const citation = screen.getByTestId("citation");
    expect(citation).toHaveTextContent("thirty (30) days");
    expect(citation.querySelector("a")).toHaveAttribute(
      "href",
      "https://notion.so/terms",
    );
    expect(screen.getByTestId("brief-detected-at").textContent).toMatch(
      /2026/,
    );
  });

  it("shows the not-found state for unknown ids", async () => {
    render(<SensoBrief changeReportId="chg_missing" />);
    await waitFor(() =>
      expect(screen.getByTestId("brief-not-found")).toBeInTheDocument(),
    );
    expect(screen.getByText(/not found/i)).toBeInTheDocument();
  });

  it("renders 'no actions' empty state when actionSummary is empty", async () => {
    render(<SensoBrief changeReportId="chg_seed_notion" />);
    await screen.findByTestId("brief");
    expect(screen.getByTestId("actions-empty")).toBeInTheDocument();
  });

  it("does not render app chrome (no upgrade button, no nav)", async () => {
    render(<SensoBrief changeReportId="chg_seed_notion" />);
    await screen.findByTestId("brief");
    expect(screen.queryByText(/upgrade to compliance pack/i)).toBeNull();
    expect(screen.queryByText(/add a vendor/i)).toBeNull();
  });

  it("applies the brief class for print CSS targeting", async () => {
    render(<SensoBrief changeReportId="chg_seed_notion" />);
    const brief = await screen.findByTestId("brief");
    expect(brief.className).toContain("brief");
  });
});
