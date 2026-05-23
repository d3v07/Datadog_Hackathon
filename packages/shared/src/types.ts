export type Iso8601 = string;
export type OrgId = string & { readonly __brand: "OrgId" };
export type UserId = string & { readonly __brand: "UserId" };
export type VendorId = string & { readonly __brand: "VendorId" };
export type ChangeReportId = string & { readonly __brand: "ChangeReportId" };
export type ActionId = string & { readonly __brand: "ActionId" };

export type Severity = "P1" | "P2" | "P3";
export type ActionKind = "slack" | "jira" | "email" | "calendar" | "draft" | "payment";
export type RoutedActionKind = "slack" | "jira" | "email" | "calendar";
export type ActionStatus = "queued" | "delivered" | "failed" | "acknowledged";
export type ActionDeliveryStatus = "queued" | "delivered" | "failed";
export type RunStage = "fetch" | "diff" | "reason" | "classify" | "route" | "publish";
export type RunStageStatus = "started" | "completed" | "failed" | "skipped";
export type ChangeState = "new" | "acknowledged" | "in-progress" | "resolved" | "snoozed";

export interface User {
  id: UserId;
  orgId: OrgId;
  name: string;
  email: string;
  role: string;
  slackUserId?: string;
}

export interface Vendor {
  id: VendorId;
  orgId: OrgId;
  name: string;
  ownerId: UserId;
  renewalDate?: Iso8601;
}

export interface ChangeDollarImpact {
  annualUsd: number;
}

export interface Change {
  summary: string;
  before?: string;
  after?: string;
  dollarImpact?: ChangeDollarImpact;
  action?: "renegotiate" | "escalate" | "accept" | "reject";
}

export interface Citation {
  label: string;
  sourceUrl: string;
  snippet: string;
}

export interface PolicyFired {
  id: string;
  name: string;
}

export interface ChangeReport {
  id: ChangeReportId;
  orgId: OrgId;
  vendorId: VendorId;
  headline: string;
  severity: Severity;
  policyFired: PolicyFired;
  changes: Change[];
  citations: Citation[];
  evidenceUrl?: string;
}

export interface SlackTextObject {
  type: "plain_text" | "mrkdwn";
  text: string;
  emoji?: boolean;
}

export interface SlackBlock {
  type: string;
  text?: SlackTextObject;
  fields?: SlackTextObject[];
  elements?: unknown[];
  [key: string]: unknown;
}

export interface SlackPayload {
  text: string;
  blocks: SlackBlock[];
  recipient?: string;
  changeReportUrl: string;
  evidenceUrl?: string;
}

export interface JiraPayload {
  projectKey: string;
  issueType: string;
  summary: string;
  description: string;
  priority: string;
  labels: string[];
  assigneeUserId?: string;
}

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface CalendarPayload {
  title: string;
  startsAt: Iso8601;
  endsAt: Iso8601;
  attendees: string[];
  description: string;
  location?: string;
}

export interface BaseAction<TKind extends ActionKind, TPayload> {
  id: ActionId;
  orgId: OrgId;
  changeReportId?: ChangeReportId;
  kind: TKind;
  target: string;
  payload: TPayload;
  firedAt: Iso8601;
  status: ActionStatus;
  externalId?: string;
  error?: string;
}

export type SlackAction = BaseAction<"slack", SlackPayload>;
export type JiraAction = BaseAction<"jira", JiraPayload>;
export type EmailAction = BaseAction<"email", EmailPayload>;
export type CalendarAction = BaseAction<"calendar", CalendarPayload>;
export type Action = SlackAction | JiraAction | EmailAction | CalendarAction;
export type ActionDraft = Action extends infer T
  ? T extends Action
    ? Omit<T, "id" | "firedAt"> & Partial<Pick<T, "id" | "firedAt">>
    : never
  : never;

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
  status: ActionDeliveryStatus;
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
