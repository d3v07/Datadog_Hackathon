import type { AgentRun } from "@redline/shared";
import type { RunStore, RunUpdate } from "../../apps/api/src/db/run-store.js";

// In-memory RunStore for tests. Shaped identically to ClickHouseRunStore so
// any code paths exercising the interface behave the same way against either
// backend.

export class InMemoryRunStore implements RunStore {
  public readonly runs = new Map<string, AgentRun>();

  // eslint-disable-next-line @typescript-eslint/require-await
  async insert(run: AgentRun): Promise<void> {
    this.runs.set(run.id, { ...run });
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async complete(runId: string, update: RunUpdate): Promise<void> {
    const existing = this.runs.get(runId);
    if (!existing) throw new Error(`run ${runId} not found`);
    const next: AgentRun = {
      ...existing,
      endedAt: update.endedAt,
      durationMs: update.durationMs,
      status: update.status,
    };
    if (update.changeReportId) next.changeReportId = update.changeReportId;
    if (update.errorStage) next.errorStage = update.errorStage;
    if (update.errorCode) next.errorCode = update.errorCode;
    if (update.errorMessage) next.errorMessage = update.errorMessage;
    this.runs.set(runId, next);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getById(runId: string): Promise<AgentRun | undefined> {
    const v = this.runs.get(runId);
    return v ? { ...v } : undefined;
  }
}
