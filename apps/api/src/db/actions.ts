import { clickhouse } from "./client.js";

// Action persistence. Per handoff/Data Model §03, ChangeReport has many Actions;
// Stripe payments persist with kind:"payment" and no change_report_id (the
// purchase isn't tied to a change). Schema lives in the existing `actions`
// ClickHouse table (DDL applied in #2).

export type ActionKind = "slack" | "jira" | "email" | "calendar" | "draft" | "payment";
export type ActionStatus = "queued" | "delivered" | "failed" | "acknowledged";

export interface ActionRecord {
  id: string;
  orgId: string;
  changeReportId?: string | undefined;
  kind: ActionKind;
  target: string;
  payload: Record<string, unknown>;
  firedAt: string; // ISO 8601
  status: ActionStatus;
  externalId?: string | undefined;
  error?: string | undefined;
}

export interface ActionStore {
  insert(action: ActionRecord): Promise<void>;
}

interface ActionRow {
  id: string;
  org_id: string;
  change_report_id: string | null;
  kind: string;
  target: string;
  payload: string;
  fired_at: string;
  status: string;
  external_id: string | null;
  error: string | null;
}

function isoToChDate(iso: string): string {
  return iso.replace("T", " ").replace("Z", "");
}

function toRow(a: ActionRecord): ActionRow {
  return {
    id: a.id,
    org_id: a.orgId,
    change_report_id: a.changeReportId ?? null,
    kind: a.kind,
    target: a.target,
    payload: JSON.stringify(a.payload),
    fired_at: isoToChDate(a.firedAt),
    status: a.status,
    external_id: a.externalId ?? null,
    error: a.error ?? null,
  };
}

export class ClickHouseActionStore implements ActionStore {
  async insert(action: ActionRecord): Promise<void> {
    await clickhouse().insert({
      table: "actions",
      values: [toRow(action)],
      format: "JSONEachRow",
    });
  }
}

let cached: ActionStore | undefined;

export function actionStore(): ActionStore {
  if (!cached) cached = new ClickHouseActionStore();
  return cached;
}

export function setActionStore(store: ActionStore): void {
  cached = store;
}
