export type Iso8601 = string;
export type IsoDate = string;
export type Sha256 = string;

export type OrgId = string;
export type UserId = string;
export type VendorId = string;
export type PolicyId = string;
export type ChangeReportId = string;
export type RunId = string;
export type ActionId = string;

export type Severity = "P1" | "P2" | "P3";
export type VendorTier = 1 | 2 | 3;
export type Posture = "ok" | "watch" | "risk";
export type DataClass = "pii" | "phi" | "financial" | "content";
export type UserRole = "procurement" | "legal" | "security" | "owner";
export type ChangeState = "new" | "acknowledged" | "in-progress" | "resolved" | "snoozed";
export type Resolution = "accepted" | "renegotiated" | "rejected" | "no-action";
export type ChangeCategory = "data" | "pricing" | "subprocessor" | "terms" | "sla" | "security";
export type Materiality = "material" | "minor" | "cosmetic";
export type RecommendationAction = "renegotiate" | "escalate" | "accept" | "reject";
export type RunStage = "fetch" | "diff" | "reason" | "classify" | "route" | "publish";
export type RunStageStatus = "started" | "completed" | "failed" | "skipped";
export type RunStatus = "running" | "unchanged" | "changed" | "failed";
export type RunTrigger = "scheduled" | "admin" | "first-scan";
export type ActionKind = "slack" | "jira" | "email" | "calendar" | "draft" | "payment";
export type RoutedActionKind = "slack" | "jira" | "email" | "calendar";
export type ActionStatus = "queued" | "delivered" | "failed" | "acknowledged";
export type ActionDeliveryStatus = "queued" | "delivered" | "failed";

export interface Org {
  id: OrgId;
  name: string;
  seatCount?: number;
  createdAt?: Iso8601;
  entitlements: {
    compliancePack: boolean;
    auditorPortal?: boolean;
  };
}

export interface User {
  id: UserId;
  orgId: OrgId;
  name: string;
  email: string;
  role: UserRole | string;
  avatarLetter?: string;
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
  id: VendorId;
  orgId: OrgId;
  name: string;
  ownerId: UserId;
  category?: string;
  tier?: VendorTier;
  posture?: Posture;
  dataClasses?: DataClass[];
  urls?: VendorUrls;
  contract?: VendorContract;
  renewalDate?: Iso8601;
  lastScanAt?: Iso8601;
  latestChangeId?: ChangeReportId;
}

export interface Citation {
  url?: string;
  quote?: string;
  section?: string;
  fetchedAt?: Iso8601;
  country?: string;
  label?: string;
  sourceUrl?: string;
  snippet?: string;
}

export interface Change {
  id?: string;
  category?: ChangeCategory;
  summary: string;
  before?: string;
  after?: string;
  materiality?: Materiality;
  dollarImpact?: {
    annualUsd: number;
    pctChange?: number;
  };
  citations?: Citation[];
  action?: RecommendationAction;
}

export interface Recommendation {
  action: RecommendationAction;
  copy: string;
}

export interface PolicyFired {
  id: PolicyId | string;
  name: string;
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
  policyFiredId: PolicyId | string;
  policyAlsoMatched: Array<PolicyId | string>;
  changes: Change[];
  recommendation: Recommendation;
  sensoUrl?: string;
  ownerId: UserId;
  stateNote?: string;
  stateChangedBy?: UserId;
  updatedAt: Iso8601;
  version: number;
  headline?: string;
  policyFired?: PolicyFired;
  evidenceUrl?: string;
  citations?: Citation[];
}

export interface EvidenceBriefResponse {
  changeReport: ChangeReport;
  vendor: {
    id: VendorId | string;
    name: string;
    category: string;
  };
  policyFired: {
    id: PolicyId | string;
    name: string;
  };
  policyAlsoMatched: Array<{ id: PolicyId | string; name: string }>;
  actionSummary: Array<{
    kind: ActionKind;
    target: string;
    status: ActionStatus;
    firedAt: Iso8601;
  }>;
}

export interface AgentRun {
  id: RunId;
  orgId: OrgId;
  vendorId: VendorId;
  startedAt: Iso8601;
  endedAt?: Iso8601;
  durationMs?: number;
  status: RunStatus;
  changeReportId?: ChangeReportId;
  trigger: RunTrigger;
  errorStage?: RunStage;
  errorCode?: string;
  errorMessage?: string;
}

export interface ChangeStateChangedEvent {
  changeReportId: ChangeReportId | string;
  state: ChangeState;
  by: UserId | string;
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
  assigneeUserId?: UserId | string;
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

export interface DraftPayload {
  title: string;
  body: string;
}

export interface PaymentPayload {
  paymentIntentId: string;
  amount: number;
  currency: string;
  sku?: string | null;
  simulated?: boolean;
  lastPaymentError?: string | null;
}

export interface BaseAction<TKind extends ActionKind, TPayload> {
  id: ActionId;
  orgId: OrgId;
  changeReportId: ChangeReportId;
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
export type DraftAction = BaseAction<"draft", DraftPayload>;
export type PaymentAction = Omit<BaseAction<"payment", PaymentPayload>, "changeReportId"> & {
  changeReportId?: ChangeReportId;
};
export type Action = SlackAction | JiraAction | EmailAction | CalendarAction | DraftAction | PaymentAction;
export type ActionDraft = Action extends infer T
  ? T extends Action
    ? Omit<T, "id" | "firedAt"> & Partial<Pick<T, "id" | "firedAt">>
    : never
  : never;

export type StreamEventName =
  | "scheduler.tick"
  | "run.stage"
  | "run.completed"
  | "change.detected"
  | "action.delivered"
  | "change.stateChanged"
  | "change.escalated"
  | "org.entitlements.changed";

export interface SchedulerTickEvent {
  vendorId: VendorId | string;
  runId: RunId | string;
  startedAt: Iso8601;
}

export interface RunStageEvent {
  runId: RunId | string;
  vendorId?: VendorId | string;
  stage: RunStage;
  status: RunStageStatus;
  durationMs?: number;
}

export interface RunCompletedEvent {
  runId: RunId | string;
  vendorId: VendorId | string;
  status: Exclude<RunStatus, "running">;
  endedAt: Iso8601;
  durationMs: number;
  changeReportId?: ChangeReportId | string;
}

export interface ChangeDetectedEvent {
  changeReportId: ChangeReportId | string;
  vendorId: VendorId | string;
  severity: Severity;
  headline: string;
}

export interface ActionDeliveredEvent {
  actionId: ActionId | string;
  changeReportId?: ChangeReportId | string;
  kind: ActionKind;
  status: ActionDeliveryStatus;
  externalId?: string;
}

export interface ChangeEscalatedEvent {
  id: ChangeReportId | string;
  toRole: Lens;
  byUserId: UserId | string;
  at: Iso8601;
  slackChannel: string;
  jiraKey: string;
}

export interface OrgEntitlementsChangedEvent {
  compliancePack: boolean;
  auditorPortal?: boolean;
  changedAt: Iso8601;
}

export type EntitlementsChangedEvent = OrgEntitlementsChangedEvent;

export interface StreamEventDataMap {
  "scheduler.tick": SchedulerTickEvent;
  "run.stage": RunStageEvent;
  "run.completed": RunCompletedEvent;
  "change.detected": ChangeDetectedEvent;
  "action.delivered": ActionDeliveredEvent;
  "change.stateChanged": ChangeStateChangedEvent;
  "change.escalated": ChangeEscalatedEvent;
  "org.entitlements.changed": OrgEntitlementsChangedEvent;
}

export interface StoredStreamEvent<TName extends StreamEventName = StreamEventName> {
  id: string;
  orgId: OrgId;
  event: TName;
  data: StreamEventDataMap[TName];
  createdAt: Iso8601;
}

export type SseEvent = {
  [K in StreamEventName]: { event: K; data: StreamEventDataMap[K] };
}[StreamEventName];

export interface VendorCreateBody {
  name: string;
  homepageUrl: string;
  ownerId: UserId | string;
  tier: VendorTier;
  dataClasses?: DataClass[];
  contract?: VendorContract;
}

export interface VendorCreateResponse {
  id: VendorId | string;
  name: string;
  firstScanRunId: RunId | string;
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

export type Lens = "procurement" | "legal" | "security" | "finance" | "it" | "audit";
export type InboxItemKind = "change" | "renewal" | "unused-seats";
export type RenewalStatus = "triage" | "negotiate" | "sign";
export type DiscoveryProvider = "google" | "microsoft";

export interface InboxItem {
  id: string;
  kind: InboxItemKind;
  vendorId: string;
  vendorName: string;
  title: string;
  summary: string;
  severity: Severity;
  dollarImpact: number | null;
  ownerEmail: string;
  occurredAt: Iso8601;
  lensTags: Lens[];
  state: ChangeState;
}

export interface Renewal {
  id: string;
  vendorId: string;
  vendorName: string;
  renewsAt: IsoDate;
  daysOut: number;
  annualValueUsd: number;
  ownerEmail: string;
  ownerId?: UserId;
  status: RenewalStatus;
  benchmarkDelta: number | null;
  declined?: boolean;
  autoRenewed?: boolean;
  lensTags?: Lens[];
}

export interface IntakeRequest {
  id: string;
  vendorName: string;
  requesterEmail: string;
  expectedSpendUsd: number;
  justification: string;
  status: "pending" | "approved" | "rejected";
  similarTools: string[];
  createdAt: Iso8601;
}

export interface Recoverable {
  totalUsd: number;
  breakdown: {
    unusedSeatsUsd: number;
    priceHikesUsd: number;
    duplicateAppsUsd: number;
    atRiskUsd: number;
  };
}

export interface DiscoveryJob {
  jobId: string;
  estimatedSeconds: number;
  expectedVendors: number;
  discoveredVendors: Array<{
    id: string;
    name: string;
    domain: string;
    category: string;
    spendUsd: number;
    confidence: number;
  }>;
}
