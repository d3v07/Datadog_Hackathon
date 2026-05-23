import type { AgentRun } from "@redline/shared";
import { newId } from "../lib/ids.js";
import { runStore } from "../db/run-store.js";
import { runStub, type StubRunnerOptions } from "./stub-runner.js";

// Queue interface — Track A's real AgentRunner will swap in here. Issue #2
// only needs first-scan with the stub runner.

export interface QueueFirstScanArgs {
  orgId: string;
  vendorId: string;
}

export interface QueueResult {
  runId: string;
}

export async function queueFirstScan(
  args: QueueFirstScanArgs,
  options?: StubRunnerOptions,
): Promise<QueueResult> {
  const runId = newId("run");
  const startedAt = new Date().toISOString();
  const run: AgentRun = {
    id: runId,
    orgId: args.orgId,
    vendorId: args.vendorId,
    startedAt,
    status: "running",
    trigger: "first-scan",
  };
  await runStore().insert(run);

  // Fire-and-forget. Errors are logged inside the runner; we don't let them
  // bubble into the POST /v1/vendors response.
  void runStub({ runId, orgId: args.orgId, vendorId: args.vendorId }, options);

  return { runId };
}
