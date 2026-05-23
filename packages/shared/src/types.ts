// Source of truth for entity shapes. Pruned subset of handoff/Data Model §03
// — only entities and fields used by issue #2. Issue #3 will extend Org with
// entitlements and add billing-related types.

export type Iso8601 = string;
export type IsoDate = string;
export type Sha256 = string;

export type Severity = "P1" | "P2" | "P3";
export type VendorTier = 1 | 2 | 3;
export type Posture = "ok" | "watch" | "risk";
export type DataClass = "pii" | "phi" | "financial" | "content";
export type UserRole = "procurement" | "legal" | "security" | "owner";

export type RunStage =
  | "fetch"
  | "diff"
  | "reason"
  | "classify"
  | "route"
  | "publish";

export type RunStatus = "running" | "unchanged" | "changed" | "failed";
export type RunTrigger = "scheduled" | "admin" | "first-scan";
export type RunStageStatus = "started" | "completed" | "failed" | "skipped";

export interface Org {
  id: string;
  name: string;
  seatCount: number;
  createdAt: Iso8601;
  entitlements: {
    compliancePack: boolean;
    auditorPortal: boolean;
  };
}

export interface User {
  id: string;
  orgId: string;
  name: string;
  email: string;
  role: UserRole;
  avatarLetter: string;
  slackUserId?: string;
}

export interface VendorUrls {
  homepage: string;
  terms: string;
  pricing: string;
  dpa: string;
  subProcessors: string;
  security: string;
  sla: string;
}

export interface VendorContract {
  renewsAt: IsoDate;
  annualSpendUsd: number;
  seatCount: number;
}

export interface Vendor {
  id: string;
  orgId: string;
  name: string;
  category: string;
  tier: VendorTier;
  posture: Posture;
  dataClasses: DataClass[];
  ownerId: string;
  urls: VendorUrls;
  contract?: VendorContract;
  lastScanAt?: Iso8601;
  latestChangeId?: string;
}

export interface AgentRun {
  id: string;
  orgId: string;
  vendorId: string;
  startedAt: Iso8601;
  endedAt?: Iso8601;
  durationMs?: number;
  status: RunStatus;
  changeReportId?: string;
  trigger: RunTrigger;
  errorStage?: RunStage;
  errorCode?: string;
  errorMessage?: string;
}

// SSE event shapes. Only the events issue #2 emits or the UI subscribes to
// during first-scan. Issue #3 will add `org.entitlements.changed`.

export interface SchedulerTickEvent {
  vendorId: string;
  runId: string;
  startedAt: Iso8601;
}

export interface RunStageEvent {
  runId: string;
  vendorId: string;
  stage: RunStage;
  status: RunStageStatus;
  durationMs?: number;
}

export interface RunCompletedEvent {
  runId: string;
  vendorId: string;
  status: Exclude<RunStatus, "running">;
  endedAt: Iso8601;
  durationMs: number;
  changeReportId?: string;
}

export type SseEvent =
  | { event: "scheduler.tick"; data: SchedulerTickEvent }
  | { event: "run.stage"; data: RunStageEvent }
  | { event: "run.completed"; data: RunCompletedEvent };

// API response shapes used by both server and client.

export interface VendorCreateBody {
  name: string;
  homepageUrl: string;
  ownerId: string;
  tier: VendorTier;
  dataClasses?: DataClass[];
  contract?: VendorContract;
}

export interface VendorCreateResponse {
  id: string;
  name: string;
  firstScanRunId: string;
  discoveredUrls: VendorUrls;
}

export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    requestId?: string;
  };
}
