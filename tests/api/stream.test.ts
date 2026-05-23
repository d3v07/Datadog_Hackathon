import { describe, expect, it } from "vitest";
import { createApp } from "../../apps/api/src/app";
import { createEventBroker } from "../../apps/api/src/stream/broker";
import type { OrgId, StoredStreamEvent, StreamEventName, UserId } from "@redline/shared";

const TOKEN = "demo_token_acme_corp_2026";
const OTHER_TOKEN = "demo_token_other_org";
const ORG_ID = "org_acme" as OrgId;
const OTHER_ORG_ID = "org_other" as OrgId;

type RequestableApp = {
  request: (path: string, init?: RequestInit) => Response | Promise<Response>;
};

describe("/v1/stream", () => {
  it("returns 401 with the standard error envelope when token is missing", async () => {
    const { app } = createHarness();

    const response = await app.request("/v1/stream");

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "unauthenticated",
        message: "Missing or invalid bearer token",
        requestId: expect.any(String),
      },
    });
  });

  it("opens an EventSource-compatible stream with expected headers", async () => {
    const { app } = createHarness();
    const controller = new AbortController();

    const response = await app.request(`/v1/stream?token=${TOKEN}`, {
      signal: controller.signal,
    });

    try {
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/event-stream");
      expect(response.headers.get("cache-control")).toBe("no-cache");
      expect(response.headers.get("x-accel-buffering")).toBe("no");
    } finally {
      controller.abort();
    }
  });

  it("emits heartbeat comments on the configured cadence", async () => {
    const { app } = createHarness({ heartbeatIntervalMs: 5 });
    const controller = new AbortController();
    const response = await app.request(`/v1/stream?token=${TOKEN}`, {
      signal: controller.signal,
    });

    try {
      await expect(withTimeout(readUntil(response, ":heartbeat\n\n"), 500)).resolves.toContain(":heartbeat");
    } finally {
      controller.abort();
    }
  });

  it("delivers only events scoped to the authenticated org", async () => {
    const { app, events } = createHarness();
    const controller = new AbortController();
    const response = await app.request(`/v1/stream?token=${TOKEN}`, {
      signal: controller.signal,
    });
    const nextEvent = withTimeout(readSseEvent(response, "change.detected"), 500);

    events.publish(OTHER_ORG_ID, "change.detected", {
      changeReportId: "chg_other",
      vendorId: "vnd_other",
      severity: "P1",
      headline: "Other org event",
    });
    events.publish(ORG_ID, "change.detected", {
      changeReportId: "chg_acme",
      vendorId: "vnd_notion",
      severity: "P1",
      headline: "Retention shrinks",
    });

    try {
      await expect(nextEvent).resolves.toMatchObject({
        event: "change.detected",
        data: {
          changeReportId: "chg_acme",
          vendorId: "vnd_notion",
          severity: "P1",
          headline: "Retention shrinks",
        },
      });
    } finally {
      controller.abort();
    }
  });

  it("replays retained org events after Last-Event-ID", async () => {
    const { app, events } = createHarness();
    const first = events.publish(ORG_ID, "scheduler.tick", {
      vendorId: "vnd_notion",
      runId: "run_001",
      startedAt: "2026-05-23T13:14:42.000Z",
    });
    events.publish(ORG_ID, "run.stage", {
      runId: "run_001",
      stage: "fetch",
      status: "completed",
      durationMs: 1180,
    });

    const controller = new AbortController();
    const response = await app.request(`/v1/stream?token=${TOKEN}`, {
      headers: { "last-event-id": first.id },
      signal: controller.signal,
    });

    try {
      await expect(withTimeout(readSseEvent(response, "run.stage"), 500)).resolves.toMatchObject({
        id: "evt_000002",
        event: "run.stage",
        data: {
          runId: "run_001",
          stage: "fetch",
          status: "completed",
          durationMs: 1180,
        },
      });
    } finally {
      controller.abort();
    }
  });

  it("accepts and serializes every documented event shape", async () => {
    const { events } = createHarness();
    const published: StoredStreamEvent[] = [
      events.publish(ORG_ID, "scheduler.tick", {
        vendorId: "vnd_notion",
        runId: "run_001",
        startedAt: "2026-05-23T13:14:42.000Z",
      }),
      events.publish(ORG_ID, "run.stage", {
        runId: "run_001",
        stage: "fetch",
        status: "completed",
        durationMs: 1180,
      }),
      events.publish(ORG_ID, "change.detected", {
        changeReportId: "chg_001",
        vendorId: "vnd_notion",
        severity: "P1",
        headline: "Retention shrinks",
      }),
      events.publish(ORG_ID, "action.delivered", {
        actionId: "act_001",
        changeReportId: "chg_001",
        kind: "slack",
        status: "delivered",
        externalId: "slack_msg_1716482538.000200",
      }),
      events.publish(ORG_ID, "change.stateChanged", {
        changeReportId: "chg_001",
        state: "acknowledged",
        by: "usr_priya" as UserId,
      }),
      events.publish(ORG_ID, "org.entitlements.changed", {
        compliancePack: true,
        changedAt: "2026-05-23T13:22:00.000Z",
      }),
    ];

    expect(published.map((event) => event.event)).toEqual<StreamEventName[]>([
      "scheduler.tick",
      "run.stage",
      "change.detected",
      "action.delivered",
      "change.stateChanged",
      "org.entitlements.changed",
    ]);
    expect(published.map((event) => event.id)).toEqual([
      "evt_000001",
      "evt_000002",
      "evt_000003",
      "evt_000004",
      "evt_000005",
      "evt_000006",
    ]);
  });
});

function createHarness(options: { heartbeatIntervalMs?: number } = {}) {
  const events = createEventBroker({
    now: () => new Date("2026-05-23T13:14:42.000Z"),
  });
  const app = createApp({
    events,
    heartbeatIntervalMs: options.heartbeatIntervalMs,
    seedData: {
      tokens: [
        { token: TOKEN, orgId: ORG_ID, userId: "usr_priya" as UserId },
        { token: OTHER_TOKEN, orgId: OTHER_ORG_ID, userId: "usr_other" as UserId },
      ],
    },
  });

  return { app, events };
}

async function readSseEvent(response: Response, eventName: string) {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("SSE response did not include a readable body");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      throw new Error(`SSE stream closed before ${eventName} was emitted`);
    }

    buffer += decoder.decode(value, { stream: true });
    let boundary = buffer.indexOf("\n\n");

    while (boundary >= 0) {
      const rawEvent = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const event = parseSseEvent(rawEvent);

      if (event.event === eventName) {
        return event;
      }

      boundary = buffer.indexOf("\n\n");
    }
  }
}

async function readUntil(response: Response, needle: string) {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("SSE response did not include a readable body");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (!buffer.includes(needle)) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
  }

  return buffer;
}

function parseSseEvent(rawEvent: string) {
  const lines = rawEvent.split(/\r?\n/);
  const idLine = lines.find((line) => line.startsWith("id:"));
  const eventLine = lines.find((line) => line.startsWith("event:"));
  const dataLines = lines.filter((line) => line.startsWith("data:"));

  return {
    id: idLine?.slice("id:".length).trim(),
    event: eventLine?.slice("event:".length).trim(),
    data: dataLines.length > 0 ? JSON.parse(dataLines.map((line) => line.slice("data:".length).trimStart()).join("\n")) : undefined,
  };
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  let timeout: NodeJS.Timeout | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error(`Timed out after ${timeoutMs}ms waiting for SSE data`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}
