export type Iso8601 = string;
export type OrgId = string & { readonly __brand: "OrgId" };
export type UserId = string & { readonly __brand: "UserId" };
export type VendorId = string & { readonly __brand: "VendorId" };
export type RunId = string & { readonly __brand: "RunId" };
export type ChangeReportId = string & { readonly __brand: "ChangeReportId" };
export type ActionId = string & { readonly __brand: "ActionId" };

export type Severity = "P1" | "P2" | "P3";
export type RunStage = "fetch" | "diff" | "reason" | "classify" | "route" | "publish";
export type RunStageStatus = "started" | "completed" | "failed" | "skipped";
export type ActionKind = "slack" | "jira" | "email" | "calendar" | "payment";
export type ActionStatus = "queued" | "delivered" | "failed";
export type ChangeState = "new" | "acknowledged" | "in-progress" | "resolved" | "snoozed";

export type StreamEventName =
  | "scheduler.tick"
  | "run.stage"
  | "change.detected"
  | "action.delivered"
  | "change.stateChanged"
  | "org.entitlements.changed";

export interface SchedulerTickEvent {
  vendorId: string;
  runId: string;
  startedAt: Iso8601;
}

export interface RunStageEvent {
  runId: string;
  stage: RunStage;
  status: RunStageStatus;
  durationMs?: number;
}

export interface ChangeDetectedEvent {
  changeReportId: string;
  vendorId: string;
  severity: Severity;
  headline: string;
}

export interface ActionDeliveredEvent {
  actionId: string;
  changeReportId: string;
  kind: ActionKind;
  status: ActionStatus;
  externalId?: string;
}

export interface ChangeStateChangedEvent {
  changeReportId: string;
  state: ChangeState;
  by: string;
}

export interface OrgEntitlementsChangedEvent {
  compliancePack: boolean;
  changedAt: Iso8601;
}

export interface StreamEventDataMap {
  "scheduler.tick": SchedulerTickEvent;
  "run.stage": RunStageEvent;
  "change.detected": ChangeDetectedEvent;
  "action.delivered": ActionDeliveredEvent;
  "change.stateChanged": ChangeStateChangedEvent;
  "org.entitlements.changed": OrgEntitlementsChangedEvent;
}

export interface StoredStreamEvent<TName extends StreamEventName = StreamEventName> {
  id: string;
  orgId: OrgId;
  event: TName;
  data: StreamEventDataMap[TName];
  createdAt: Iso8601;
}
