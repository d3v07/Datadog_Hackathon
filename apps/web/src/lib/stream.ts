import { useEffect, useRef, useState } from "react";
import type {
  RunStageEvent,
  RunCompletedEvent,
  SchedulerTickEvent,
} from "@redline/shared";
import { DEMO_BEARER_TOKEN } from "./api.js";

// EventSource subscription scoped to a single first-scan runId. EventSource
// can't set headers, so the token is appended as ?token=. Last-Event-ID is
// handled natively by EventSource on reconnect.

export type FirstScanStatus =
  | "idle"
  | "running"
  | "completed-unchanged"
  | "completed-changed"
  | "failed";

export interface FirstScanState {
  status: FirstScanStatus;
  stages: Record<string, "started" | "completed" | "failed" | "skipped">;
  lastError?: string;
}

const INITIAL_STATE: FirstScanState = { status: "idle", stages: {} };

interface SseEventEnvelope<T> {
  event: string;
  data: T;
}

function parse<T>(raw: string): T | undefined {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

export interface UseFirstScanOptions {
  // Inject a factory for testing.
  eventSourceFactory?: (url: string) => EventSource;
}

export function useFirstScan(
  runId: string | undefined,
  options: UseFirstScanOptions = {},
): FirstScanState {
  const [state, setState] = useState<FirstScanState>(INITIAL_STATE);
  const factoryRef = useRef(options.eventSourceFactory);
  factoryRef.current = options.eventSourceFactory;

  useEffect(() => {
    if (!runId) {
      setState(INITIAL_STATE);
      return;
    }
    setState({ status: "running", stages: {} });

    const url = `/v1/stream?token=${encodeURIComponent(DEMO_BEARER_TOKEN)}`;
    const factory =
      factoryRef.current ?? ((u: string) => new EventSource(u));
    const es = factory(url);

    const handleTick = (e: MessageEvent) => {
      const payload = parse<SchedulerTickEvent>(e.data);
      if (!payload || payload.runId !== runId) return;
      // Could surface startedAt; not needed for the AC.
    };
    const handleStage = (e: MessageEvent) => {
      const payload = parse<RunStageEvent>(e.data);
      if (!payload || payload.runId !== runId) return;
      setState((prev) => ({
        ...prev,
        stages: { ...prev.stages, [payload.stage]: payload.status },
      }));
    };
    const handleCompleted = (e: MessageEvent) => {
      const payload = parse<RunCompletedEvent>(e.data);
      if (!payload || payload.runId !== runId) return;
      setState((prev) => ({
        ...prev,
        status:
          payload.status === "unchanged"
            ? "completed-unchanged"
            : payload.status === "changed"
              ? "completed-changed"
              : "failed",
      }));
      es.close();
    };

    es.addEventListener("scheduler.tick", handleTick as EventListener);
    es.addEventListener("run.stage", handleStage as EventListener);
    es.addEventListener("run.completed", handleCompleted as EventListener);
    es.addEventListener("error", () => {
      // EventSource auto-reconnects on transport errors. Only surface as failed
      // when readyState is CLOSED (we've given up).
      if (es.readyState === EventSource.CLOSED) {
        setState((prev) => ({
          ...prev,
          status: prev.status === "running" ? "failed" : prev.status,
          lastError: "stream closed",
        }));
      }
    });

    return () => {
      es.close();
    };
  }, [runId]);

  return state;
}
