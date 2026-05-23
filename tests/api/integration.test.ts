import { describe, expect, it } from "vitest";
import type { ChangeReport, UserId } from "@redline/shared";
import { routeChangeReport } from "../../apps/api/src/agent/router";
import { createApp } from "../../apps/api/src/app";
import { createActionRepository } from "../../apps/api/src/db/actions";
import { InMemoryChangeReportRepository } from "../../apps/api/src/db/changeReports";
import { createSeedChangeReport, createSeedToken } from "../../apps/api/src/seed/factories";
import { createServerApp, DEV_SEED_CHANGE_ID } from "../../apps/api/src/server";
import { createEventBroker } from "../../apps/api/src/stream/broker";
import { createUsers, createVendor, NOW, ORG_ID } from "./support/fixtures";

const TOKEN = "demo_token_acme_corp_2026";
const USER_ID = "usr_priya";

describe("integrated API event flow", () => {
  it("can start the dev server app with a seeded change report", async () => {
    const app = createServerApp(["node", "server", "--seed"]);

    const response = await app.request(`/v1/changes/${DEV_SEED_CHANGE_ID}/acknowledge`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${TOKEN}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ note: "Seed check" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      id: DEV_SEED_CHANGE_ID,
      state: "acknowledged",
    });
  });

  it("uses one SSE history for lifecycle and routed-action events", async () => {
    const change = createSeedChangeReport({
      id: "chg_integrated_notion" as ChangeReport["id"],
      orgId: ORG_ID,
      vendorId: "vnd_notion" as ChangeReport["vendorId"],
      runId: "run_integrated_notion" as ChangeReport["runId"],
      ownerId: USER_ID as UserId,
      detectedAt: "2026-05-22T14:42:18.000Z",
      severity: "P1",
      state: "new",
    });
    const reports = new InMemoryChangeReportRepository([change]);
    const events = createEventBroker({ now: () => new Date(NOW) });
    const actions = createActionRepository({ now: () => new Date(NOW) });
    const app = createApp({
      reports,
      events,
      seedData: {
        tokens: [createSeedToken({ token: TOKEN, orgId: ORG_ID, userId: USER_ID })],
      },
      now: () => new Date(NOW),
    });

    const ack = await app.request(`/v1/changes/${change.id}/acknowledge`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${TOKEN}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ note: "Reviewed" }),
    });
    expect(ack.status).toBe(200);

    const stateEvent = events.listHistory(ORG_ID)[0];
    expect(stateEvent).toMatchObject({
      event: "change.stateChanged",
      data: {
        changeReportId: change.id,
        state: "acknowledged",
      },
    });

    const actionChange = {
      ...change,
      headline: "Retention shrinks and price rises",
      policyFired: {
        id: "pol_data_retention_pii_shrink",
        name: "Data retention for PII vendors",
      },
      citations: [
        {
          label: "Nimble capture",
          sourceUrl: "https://notion.so/terms",
          snippet: "Customer data retention is limited to 30 days after termination.",
        },
      ],
      evidenceUrl: "https://senso.example/evidence/chg_integrated_notion",
    } satisfies ChangeReport;

    await routeChangeReport({
      changeReport: actionChange,
      vendor: createVendor(),
      users: createUsers(),
      routes: ["jira:SEC"],
      actions,
      events,
      baseUrl: "https://redline.example",
      now: () => new Date(NOW),
    });

    if (!stateEvent) {
      throw new Error("Expected lifecycle event");
    }

    const controller = new AbortController();
    const stream = await app.request(`/v1/stream?token=${TOKEN}`, {
      headers: { "last-event-id": stateEvent.id },
      signal: controller.signal,
    });

    try {
      await expect(withTimeout(readSseEvent(stream, "action.delivered"), 500)).resolves.toMatchObject({
        event: "action.delivered",
        data: {
          actionId: "act_000001",
          changeReportId: change.id,
          kind: "jira",
          status: "queued",
        },
      });
    } finally {
      controller.abort();
    }
  });
});

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
