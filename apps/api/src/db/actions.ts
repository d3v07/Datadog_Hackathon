import {
  parseAction,
  type Action,
  type ActionDraft,
  type ActionId,
  type ActionKind,
  type ActionStatus,
  type ChangeReportId,
  type OrgId,
} from "@redline/shared";
import { clickhouse } from "./client.js";

export interface ActionRepositoryOptions {
  now?: () => Date;
  nextId?: () => ActionId;
}

export class ActionRepository {
  private readonly now: () => Date;
  private readonly nextId: () => ActionId;
  private rows: Action[] = [];
  private sequence = 0;

  constructor(options: ActionRepositoryOptions = {}) {
    this.now = options.now ?? (() => new Date());
    this.nextId =
      options.nextId ??
      (() => {
        this.sequence += 1;
        return `act_${String(this.sequence).padStart(6, "0")}` as ActionId;
      });
  }

  insert(draft: ActionDraft): Action {
    const action = parseAction({
      ...draft,
      id: draft.id ?? this.nextId(),
      firedAt: draft.firedAt ?? this.now().toISOString(),
    });

    this.rows = [...this.rows, action];
    return copyAction(action);
  }

  listByOrg(orgId: OrgId): Action[] {
    return this.rows.filter((action) => action.orgId === orgId).map(copyAction);
  }

  listByChangeReport(changeReportId: ChangeReportId): Action[] {
    return this.rows.filter((action) => action.changeReportId === changeReportId).map(copyAction);
  }

  all(): Action[] {
    return this.rows.map(copyAction);
  }
}

export function createActionRepository(options: ActionRepositoryOptions = {}): ActionRepository {
  return new ActionRepository(options);
}

function copyAction(action: Action): Action {
  return structuredClone(action);
}

export interface ActionRecord {
  id: string;
  orgId: string;
  changeReportId?: string | undefined;
  kind: ActionKind;
  target: string;
  payload: Record<string, unknown>;
  firedAt: string;
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
