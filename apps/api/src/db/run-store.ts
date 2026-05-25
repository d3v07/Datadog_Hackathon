import type { AgentRun, RunStatus, RunStage } from "@unsyphn/shared";
import { clickhouse } from "./client.js";

// AgentRun persistence. ClickHouse-backed in prod (per handoff/Data Model §04);
// in-memory variant lives in tests/ for unit tests.

export interface RunUpdate {
  endedAt: string;
  durationMs: number;
  status: Exclude<RunStatus, "running">;
  changeReportId?: string;
  errorStage?: RunStage;
  errorCode?: string;
  errorMessage?: string;
}

export interface RunStore {
  insert(run: AgentRun): Promise<void>;
  complete(runId: string, update: RunUpdate): Promise<void>;
  getById(runId: string): Promise<AgentRun | undefined>;
}

// ClickHouse row shape (snake_case matches DDL).
interface AgentRunRow {
  id: string;
  org_id: string;
  vendor_id: string;
  started_at: string;
  ended_at: string | null;
  duration_ms: number | null;
  status: string;
  change_report_id: string | null;
  trigger: string;
  error_stage: string | null;
  error_code: string | null;
  error_message: string | null;
}

function isoToChDate(iso: string): string {
  // ClickHouse DateTime64 wants "YYYY-MM-DD HH:MM:SS.SSS"; accept either.
  return iso.replace("T", " ").replace("Z", "");
}

function toRow(run: AgentRun): AgentRunRow {
  return {
    id: run.id,
    org_id: run.orgId,
    vendor_id: run.vendorId,
    started_at: isoToChDate(run.startedAt),
    ended_at: run.endedAt ? isoToChDate(run.endedAt) : null,
    duration_ms: run.durationMs ?? null,
    status: run.status,
    change_report_id: run.changeReportId ?? null,
    trigger: run.trigger,
    error_stage: run.errorStage ?? null,
    error_code: run.errorCode ?? null,
    error_message: run.errorMessage ?? null,
  };
}

function fromRow(row: AgentRunRow): AgentRun {
  const run: AgentRun = {
    id: row.id,
    orgId: row.org_id,
    vendorId: row.vendor_id,
    startedAt: new Date(row.started_at.replace(" ", "T") + "Z").toISOString(),
    status: row.status as RunStatus,
    trigger: row.trigger as AgentRun["trigger"],
  };
  if (row.ended_at) {
    run.endedAt = new Date(row.ended_at.replace(" ", "T") + "Z").toISOString();
  }
  if (row.duration_ms !== null) run.durationMs = row.duration_ms;
  if (row.change_report_id) run.changeReportId = row.change_report_id;
  if (row.error_stage) run.errorStage = row.error_stage as RunStage;
  if (row.error_code) run.errorCode = row.error_code;
  if (row.error_message) run.errorMessage = row.error_message;
  return run;
}

export class ClickHouseRunStore implements RunStore {
  async insert(run: AgentRun): Promise<void> {
    await clickhouse().insert({
      table: "agent_runs",
      values: [toRow(run)],
      format: "JSONEachRow",
    });
  }

  async complete(runId: string, update: RunUpdate): Promise<void> {
    const existing = await this.getById(runId);
    if (!existing) {
      throw new Error(`agent_run ${runId} not found`);
    }
    const merged: AgentRun = {
      ...existing,
      endedAt: update.endedAt,
      durationMs: update.durationMs,
      status: update.status,
    };
    if (update.changeReportId) merged.changeReportId = update.changeReportId;
    if (update.errorStage) merged.errorStage = update.errorStage;
    if (update.errorCode) merged.errorCode = update.errorCode;
    if (update.errorMessage) merged.errorMessage = update.errorMessage;
    await clickhouse().insert({
      table: "agent_runs",
      values: [toRow(merged)],
      format: "JSONEachRow",
    });
  }

  async getById(runId: string): Promise<AgentRun | undefined> {
    const result = await clickhouse().query({
      query:
        "SELECT * FROM agent_runs FINAL WHERE id = {id:String} LIMIT 1",
      query_params: { id: runId },
      format: "JSONEachRow",
    });
    const rows = (await result.json()) as AgentRunRow[];
    const row = rows[0];
    return row ? fromRow(row) : undefined;
  }
}

let cached: RunStore | undefined;

export function runStore(): RunStore {
  if (!cached) cached = new ClickHouseRunStore();
  return cached;
}

// Allow tests to swap in an InMemoryRunStore implementation.
export function setRunStore(store: RunStore): void {
  cached = store;
}
