export type Iso8601 = string;
export type OrgId = string & { readonly __brand: "OrgId" };
export type UserId = string & { readonly __brand: "UserId" };
export type VendorId = string & { readonly __brand: "VendorId" };
export type PolicyId = string & { readonly __brand: "PolicyId" };
export type ChangeReportId = string & { readonly __brand: "ChangeReportId" };
export type RunId = string & { readonly __brand: "RunId" };

export type Severity = "P1" | "P2" | "P3";
export type ChangeState = "new" | "acknowledged" | "in-progress" | "resolved" | "snoozed";
export type Resolution = "accepted" | "renegotiated" | "rejected" | "no-action";
export type ChangeCategory = "data" | "pricing" | "subprocessor" | "terms" | "sla" | "security";
export type Materiality = "material" | "minor" | "cosmetic";

export interface Citation {
  url: string;
  quote: string;
  section?: string;
  fetchedAt: Iso8601;
  country?: string;
}

export interface Change {
  id: string;
  category: ChangeCategory;
  summary: string;
  before: string;
  after: string;
  materiality: Materiality;
  dollarImpact?: {
    annualUsd: number;
    pctChange: number;
  };
  citations: Citation[];
}

export interface Recommendation {
  action: "renegotiate" | "escalate" | "accept" | "reject";
  copy: string;
}

export interface ChangeReport {
  id: ChangeReportId;
  orgId: OrgId;
  vendorId: VendorId;
  runId: RunId;
  detectedAt: Iso8601;
  severity: Severity;
  state: ChangeState;
  acknowledgedAt?: Iso8601;
  snoozedUntil?: Iso8601;
  resolvedAt?: Iso8601;
  resolution?: Resolution;
  policyFiredId: PolicyId;
  policyAlsoMatched: PolicyId[];
  changes: Change[];
  recommendation: Recommendation;
  sensoUrl?: string;
  ownerId: UserId;
  stateNote?: string;
  stateChangedBy?: UserId;
  updatedAt: Iso8601;
  version: number;
}

export interface ChangeStateChangedEvent {
  changeReportId: ChangeReportId;
  state: ChangeState;
  by: UserId;
}

export interface AcknowledgeChangeResponse {
  id: ChangeReportId;
  state: "acknowledged";
  acknowledgedAt: Iso8601;
}

export interface SnoozeChangeResponse {
  id: ChangeReportId;
  state: "snoozed";
  snoozedUntil: Iso8601;
}

export interface ResolveChangeResponse {
  id: ChangeReportId;
  state: "resolved";
  resolution: Resolution;
  resolvedAt: Iso8601;
}
