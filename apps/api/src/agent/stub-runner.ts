import type { RunStage } from "@redline/shared";
import { bus } from "../lib/bus.js";
import { runStore } from "../db/run-store.js";
import { logger } from "../logger.js";

// Stub runner. Issue #2 owns the queue + first-scan SSE contract, not the real
// Nimble/Gemini pipeline (that belongs to Track A). This emits the canonical
// SSE event sequence so the UI is fully exercised end-to-end. Final state is
// `unchanged` because a brand-new vendor has no prior snapshot to diff against.

const STAGES: readonly RunStage[] = [
  "fetch",
  "diff",
  "reason",
  "classify",
  "route",
  "publish",
];

// Per-stage delay in ms. Kept short so first-scans complete in well under a
// minute. Tests override to 0 for determinism.
const DEFAULT_STAGE_DELAY_MS = 250;

export interface StubRunnerOptions {
  stageDelayMs?: number;
}

async function delay(ms: number): Promise<void> {
  if (ms <= 0) return;
  await new Promise((r) => setTimeout(r, ms));
}

export async function runStub(
  args: { runId: string; orgId: string; vendorId: string },
  options: StubRunnerOptions = {},
): Promise<void> {
  const stageDelay = options.stageDelayMs ?? DEFAULT_STAGE_DELAY_MS;
  const startedAt = new Date();

  bus.publish(args.orgId, {
    event: "scheduler.tick",
    data: {
      vendorId: args.vendorId,
      runId: args.runId,
      startedAt: startedAt.toISOString(),
    },
  });

  for (const stage of STAGES) {
    const stageStart = Date.now();
    bus.publish(args.orgId, {
      event: "run.stage",
      data: {
        runId: args.runId,
        vendorId: args.vendorId,
        stage,
        status: "started",
      },
    });
    // eslint-disable-next-line no-await-in-loop
    await delay(stageDelay);
    bus.publish(args.orgId, {
      event: "run.stage",
      data: {
        runId: args.runId,
        vendorId: args.vendorId,
        stage,
        status: "completed",
        durationMs: Date.now() - stageStart,
      },
    });
  }

  const endedAt = new Date();
  const durationMs = endedAt.getTime() - startedAt.getTime();

  try {
    await runStore().complete(args.runId, {
      endedAt: endedAt.toISOString(),
      durationMs,
      status: "unchanged",
    });
  } catch (err) {
    logger.error({ err, runId: args.runId }, "Stub runner failed to persist completion");
  }

  bus.publish(args.orgId, {
    event: "run.completed",
    data: {
      runId: args.runId,
      vendorId: args.vendorId,
      status: "unchanged",
      endedAt: endedAt.toISOString(),
      durationMs,
    },
  });
}
