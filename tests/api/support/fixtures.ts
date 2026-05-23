import type { ChangeReport, OrgId, User, UserId, Vendor, VendorId } from "@redline/shared";

export const NOW = "2026-05-23T13:14:42.000Z";
export const ORG_ID = "org_acme" as OrgId;
export const VENDOR_ID = "vnd_notion" as VendorId;
export const OWNER_ID = "usr_priya" as UserId;

export function createVendor(): Vendor {
  return {
    id: VENDOR_ID,
    orgId: ORG_ID,
    name: "Notion",
    ownerId: OWNER_ID,
    renewalDate: "2026-08-21T00:00:00.000Z",
  };
}

export function createUsers(): User[] {
  return [
    {
      id: OWNER_ID,
      orgId: ORG_ID,
      name: "Priya Shah",
      email: "priya@example.com",
      role: "procurement",
      slackUserId: "U010PRIYA",
    },
  ];
}

export function createChangeReport(): ChangeReport {
  return {
    id: "chg_notion_001" as ChangeReport["id"],
    orgId: ORG_ID,
    vendorId: VENDOR_ID,
    runId: "run_notion_001" as ChangeReport["runId"],
    detectedAt: NOW,
    headline: "Retention shrinks and price rises",
    severity: "P1",
    state: "new",
    policyFiredId: "pol_pii_retention" as ChangeReport["policyFiredId"],
    policyAlsoMatched: [],
    policyFired: {
      id: "pol_pii_retention",
      name: "Data retention for PII vendors",
    },
    changes: [
      {
        id: "chg_data_retention",
        category: "data",
        summary: "Retention changed from 90 to 30 days",
        before: "90 days",
        after: "30 days",
        materiality: "material",
        citations: [
          {
            url: "https://notion.so/terms",
            quote: "Customer data retention is limited to 30 days after termination.",
            fetchedAt: NOW,
            section: "Data retention",
          },
        ],
        action: "escalate",
      },
      {
        id: "chg_price_increase",
        category: "pricing",
        summary: "Per-seat price increased from $16 to $19",
        before: "$16",
        after: "$19",
        materiality: "material",
        dollarImpact: { annualUsd: 28400, pctChange: 18.75 },
        citations: [
          {
            url: "https://notion.so/pricing",
            quote: "Business seats are billed at $19 per user.",
            fetchedAt: NOW,
            section: "Pricing",
          },
        ],
        action: "renegotiate",
      },
    ],
    recommendation: {
      action: "renegotiate",
      copy: "Escalate Notion renewal before the retention and pricing changes land.",
    },
    citations: [
      {
        label: "Nimble capture",
        sourceUrl: "https://notion.so/terms",
        snippet: "Customer data retention is limited to 30 days after termination.",
      },
    ],
    sensoUrl: "https://senso.example/evidence/chg_notion_001",
    evidenceUrl: "https://senso.example/evidence/chg_notion_001",
    ownerId: OWNER_ID,
    updatedAt: NOW,
    version: 1,
  };
}
