import type { ChangeReport, ChangeReportId, ChangeState, OrgId, RunId, Severity, UserId, VendorId } from "@unsyphn/shared";
import type { SeedToken } from "../auth.js";

export interface SeedOrg {
  id: OrgId;
  name: string;
}

export interface SeedUser {
  id: UserId;
  orgId: OrgId;
  name: string;
}

export function createSeedOrg(input: { id: string; name: string }): SeedOrg {
  return {
    id: input.id as OrgId,
    name: input.name,
  };
}

export function createSeedUser(input: { id: string; orgId: string; name: string }): SeedUser {
  return {
    id: input.id as UserId,
    orgId: input.orgId as OrgId,
    name: input.name,
  };
}

export function createSeedToken(input: { token: string; orgId: string; userId: string }): SeedToken {
  return {
    token: input.token,
    orgId: input.orgId as OrgId,
    userId: input.userId as UserId,
  };
}

export function createSeedChangeReport(
  input: Partial<ChangeReport> & {
    id: string;
    orgId: string;
    vendorId: string;
    runId: string;
    ownerId: string;
    detectedAt: string;
    severity: Severity;
    state: ChangeState;
  },
): ChangeReport {
  return {
    id: input.id as ChangeReportId,
    orgId: input.orgId as OrgId,
    vendorId: input.vendorId as VendorId,
    runId: input.runId as RunId,
    detectedAt: input.detectedAt,
    severity: input.severity,
    state: input.state,
    ...(input.acknowledgedAt === undefined ? {} : { acknowledgedAt: input.acknowledgedAt }),
    ...(input.snoozedUntil === undefined ? {} : { snoozedUntil: input.snoozedUntil }),
    ...(input.resolvedAt === undefined ? {} : { resolvedAt: input.resolvedAt }),
    ...(input.resolution === undefined ? {} : { resolution: input.resolution }),
    policyFiredId: "pol_data_retention_pii_shrink" as ChangeReport["policyFiredId"],
    policyAlsoMatched: [],
    changes: [
      {
        id: "d1",
        category: "data",
        summary: "User-content retention reduced from 90 to 30 days",
        before: "retained for ninety (90) days",
        after: "retained for thirty (30) days",
        materiality: "material",
        citations: [
          {
            url: "https://notion.so/terms",
            quote: "User content is retained for thirty (30) days after account deletion.",
            section: "Section 7.2",
            fetchedAt: "2026-05-22T14:42:11.000Z",
          },
        ],
      },
    ],
    recommendation: {
      action: "renegotiate",
      copy: "Open renewal conversation.",
    },
    ownerId: input.ownerId as UserId,
    ...(input.stateNote === undefined ? {} : { stateNote: input.stateNote }),
    ...(input.stateChangedBy === undefined ? {} : { stateChangedBy: input.stateChangedBy }),
    updatedAt: input.updatedAt ?? input.detectedAt,
    version: input.version ?? 1,
  };
}
