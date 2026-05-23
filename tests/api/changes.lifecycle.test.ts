import { describe, expect, it } from "vitest";

import type { ChangeReport } from "@redline/shared";
import { InMemoryChangeReportRepository } from "../../apps/api/src/db/changeReports";
import { createApp } from "../../apps/api/src/app";
import { createSeedChangeReport, createSeedToken } from "../../apps/api/src/seed/factories";
import { createEventBroker } from "../../apps/api/src/stream/broker";

const ORG_ID = "org_acme";
const USER_ID = "usr_priya";
const TOKEN = "demo_token_acme_corp_2026";
const CHANGE_ID = "chg_2026_05_22_notion";
const NOW = new Date("2026-05-23T13:18:00.000Z");
const SNOOZE_UNTIL = "2026-06-15T00:00:00.000Z";

type RequestableApp = {
  request: (path: string, init?: RequestInit) => Response | Promise<Response>;
};

type LifecycleCase = {
  name: string;
  path: (id: string) => string;
  seed: Partial<ChangeReport>;
  payload: Record<string, unknown>;
  response: Record<string, unknown>;
  persisted: Record<string, unknown>;
};

const lifecycleCases: LifecycleCase[] = [
  {
    name: "acknowledge",
    path: (id) => `/v1/changes/${id}/acknowledge`,
    seed: { state: "new" },
    payload: { note: "Reviewed by vendor owner" },
    response: {
      state: "acknowledged",
      acknowledgedAt: NOW.toISOString(),
    },
    persisted: {
      state: "acknowledged",
      acknowledgedAt: NOW.toISOString(),
      stateChangedBy: USER_ID,
      stateNote: "Reviewed by vendor owner",
    },
  },
  {
    name: "snooze",
    path: (id) => `/v1/changes/${id}/snooze`,
    seed: { state: "acknowledged", acknowledgedAt: "2026-05-22T16:00:00.000Z" },
    payload: { untilAt: SNOOZE_UNTIL, note: "Revisit during renewal prep" },
    response: {
      state: "snoozed",
      snoozedUntil: SNOOZE_UNTIL,
    },
    persisted: {
      state: "snoozed",
      snoozedUntil: SNOOZE_UNTIL,
      stateChangedBy: USER_ID,
      stateNote: "Revisit during renewal prep",
    },
  },
  {
    name: "resolve",
    path: (id) => `/v1/changes/${id}/resolve`,
    seed: { state: "in-progress", acknowledgedAt: "2026-05-22T16:00:00.000Z" },
    payload: { resolution: "renegotiated", note: "Retention restored in renewal" },
    response: {
      state: "resolved",
      resolution: "renegotiated",
    },
    persisted: {
      state: "resolved",
      resolution: "renegotiated",
      resolvedAt: NOW.toISOString(),
      stateChangedBy: USER_ID,
      stateNote: "Retention restored in renewal",
    },
  },
];

const invalidPayloadCases: LifecycleCase[] = [
  {
    name: "acknowledge",
    path: (id) => `/v1/changes/${id}/acknowledge`,
    seed: { state: "new" },
    payload: { note: "x".repeat(501) },
    response: {},
    persisted: {},
  },
  {
    name: "acknowledge whitespace-only note",
    path: (id) => `/v1/changes/${id}/acknowledge`,
    seed: { state: "new" },
    payload: { note: "   " },
    response: {},
    persisted: {},
  },
  {
    name: "snooze",
    path: (id) => `/v1/changes/${id}/snooze`,
    seed: { state: "acknowledged", acknowledgedAt: "2026-05-22T16:00:00.000Z" },
    payload: { untilAt: "2026-05-22T00:00:00.000Z" },
    response: {},
    persisted: {},
  },
  {
    name: "resolve",
    path: (id) => `/v1/changes/${id}/resolve`,
    seed: { state: "in-progress", acknowledgedAt: "2026-05-22T16:00:00.000Z" },
    payload: { resolution: "deferred" },
    response: {},
    persisted: {},
  },
];

const conflictCases: LifecycleCase[] = [
  {
    name: "acknowledge",
    path: (id) => `/v1/changes/${id}/acknowledge`,
    seed: { state: "acknowledged", acknowledgedAt: "2026-05-22T16:00:00.000Z" },
    payload: { note: "Duplicate ack" },
    response: {},
    persisted: {},
  },
  {
    name: "snooze",
    path: (id) => `/v1/changes/${id}/snooze`,
    seed: {
      state: "resolved",
      acknowledgedAt: "2026-05-22T16:00:00.000Z",
      resolvedAt: "2026-05-22T18:00:00.000Z",
      resolution: "accepted",
    },
    payload: { untilAt: SNOOZE_UNTIL },
    response: {},
    persisted: {},
  },
  {
    name: "resolve",
    path: (id) => `/v1/changes/${id}/resolve`,
    seed: {
      state: "resolved",
      acknowledgedAt: "2026-05-22T16:00:00.000Z",
      resolvedAt: "2026-05-22T18:00:00.000Z",
      resolution: "accepted",
    },
    payload: { resolution: "renegotiated" },
    response: {},
    persisted: {},
  },
];

describe("change lifecycle routes", () => {
  for (const testCase of lifecycleCases) {
    it(`${testCase.name} persists the state transition`, async () => {
      const { app, change, reports } = createHarness(testCase.seed);

      const response = await postJson(app, testCase.path(change.id), testCase.payload);

      expect(response.status).toBe(200);
      await expectJson(response, {
        id: change.id,
        ...testCase.response,
      });

      const persisted = await reports.getLatest(change.orgId, change.id);
      expect(persisted).toMatchObject({
        id: change.id,
        version: change.version + 1,
        updatedAt: NOW.toISOString(),
        ...testCase.persisted,
      });

      const versions = await reports.listVersions(change.orgId, change.id);
      expect(versions).toHaveLength(2);
      expect(versions[0]).toMatchObject({
        id: change.id,
        version: change.version,
        state: testCase.seed.state,
      });
      expect(versions[1]).toMatchObject({
        id: change.id,
        version: change.version + 1,
        updatedAt: NOW.toISOString(),
        ...testCase.persisted,
      });
    });
  }

  for (const testCase of invalidPayloadCases) {
    it(`${testCase.name} returns 422 for an invalid payload`, async () => {
      const { app, change } = createHarness(testCase.seed);

      const response = await postJson(app, testCase.path(change.id), testCase.payload);

      await expectError(response, 422, "unprocessable");
    });
  }

  for (const testCase of lifecycleCases) {
    it(`${testCase.name} returns 404 when the change is missing`, async () => {
      const { app } = createHarness(testCase.seed);

      const response = await postJson(app, testCase.path("chg_missing"), testCase.payload);

      await expectError(response, 404, "not-found");
    });
  }

  for (const testCase of conflictCases) {
    it(`${testCase.name} returns 409 for a conflicting state transition`, async () => {
      const { app, change } = createHarness(testCase.seed);

      const response = await postJson(app, testCase.path(change.id), testCase.payload);

      await expectError(response, 409, "conflict");
    });
  }

  for (const testCase of lifecycleCases) {
    it(`${testCase.name} returns 401 without authentication`, async () => {
      const { app, change } = createHarness(testCase.seed);

      const response = await postJson(app, testCase.path(change.id), testCase.payload, { token: null });

      await expectError(response, 401, "unauthenticated");
    });
  }

  it("captures a change.stateChanged SSE event for a successful transition", async () => {
    const { app, change } = createHarness({ state: "new" });
    const streamController = new AbortController();
    const stream = await app.request(`/v1/stream?token=${TOKEN}`, {
      signal: streamController.signal,
    });

    expect(stream.status).toBe(200);
    expect(stream.headers.get("content-type")).toContain("text/event-stream");

    const eventPromise = withTimeout(readSseEvent(stream, "change.stateChanged"), 1_000);

    const response = await postJson(app, `/v1/changes/${change.id}/acknowledge`, {
      note: "Reviewed by vendor owner",
    });

    expect(response.status).toBe(200);

    try {
      const event = await eventPromise;
      expect(event).toEqual({
        event: "change.stateChanged",
        data: expect.objectContaining({
          changeReportId: change.id,
          state: "acknowledged",
          by: USER_ID,
        }),
      });
    } finally {
      streamController.abort();
    }
  });
});

function createHarness(changeOverrides: Partial<ChangeReport> = {}) {
  const change = createSeedChangeReport({
    id: CHANGE_ID as ChangeReport["id"],
    orgId: ORG_ID as ChangeReport["orgId"],
    vendorId: "vnd_notion" as ChangeReport["vendorId"],
    runId: "run_2026_05_22_notion" as ChangeReport["runId"],
    ownerId: USER_ID as ChangeReport["ownerId"],
    detectedAt: "2026-05-22T14:42:18.000Z",
    severity: "P1",
    state: "new",
    updatedAt: "2026-05-22T14:42:18.000Z",
    version: 1,
    ...changeOverrides,
  });
  const token = createSeedToken({ token: TOKEN, orgId: ORG_ID, userId: USER_ID });
  const reports = new InMemoryChangeReportRepository([change]);
  const events = createEventBroker();
  const app = createApp({
    reports,
    events,
    seedData: {
      tokens: [token],
    },
    now: () => NOW,
  });

  return { app, change, reports, events };
}

async function postJson(
  app: RequestableApp,
  path: string,
  payload: Record<string, unknown>,
  options: { token: string | null } = { token: TOKEN },
) {
  const headers = new Headers({ "content-type": "application/json" });

  if (options.token !== null) {
    headers.set("authorization", `Bearer ${options.token}`);
  }

  return app.request(path, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
}

async function expectJson(response: Response, expected: Record<string, unknown>) {
  await expect(response.json()).resolves.toMatchObject(expected);
}

async function expectError(response: Response, status: number, code: string) {
  expect(response.status).toBe(status);
  await expect(response.json()).resolves.toMatchObject({
    error: {
      code,
      message: expect.any(String),
    },
  });
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

function parseSseEvent(rawEvent: string) {
  const lines = rawEvent.split(/\r?\n/);
  const eventLine = lines.find((line) => line.startsWith("event:"));
  const dataLines = lines.filter((line) => line.startsWith("data:"));

  return {
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
        timeout = setTimeout(() => reject(new Error(`Timed out after ${timeoutMs}ms waiting for SSE event`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}
