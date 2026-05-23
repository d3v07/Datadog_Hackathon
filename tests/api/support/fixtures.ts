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
    headline: "Retention shrinks and price rises",
    severity: "P1",
    policyFired: {
      id: "pol_pii_retention",
      name: "Data retention for PII vendors",
    },
    changes: [
      {
        summary: "Retention changed from 90 to 30 days",
        before: "90 days",
        after: "30 days",
        action: "escalate",
      },
      {
        summary: "Per-seat price increased from $16 to $19",
        before: "$16",
        after: "$19",
        dollarImpact: { annualUsd: 28400 },
        action: "renegotiate",
      },
    ],
    citations: [
      {
        label: "Nimble capture",
        sourceUrl: "https://notion.so/terms",
        snippet: "Customer data retention is limited to 30 days after termination.",
      },
    ],
    evidenceUrl: "https://senso.example/evidence/chg_notion_001",
  };
}
