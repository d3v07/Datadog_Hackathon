import { describe, expect, it } from "vitest";
import type { ChangeReport, StoredStreamEvent } from "@unsyphn/shared";

import { InMemoryChangeReportRepository } from "../../apps/api/src/db/changeReports";
import { createApp } from "../../apps/api/src/app";
import { createSeedChangeReport, createSeedToken } from "../../apps/api/src/seed/factories";
import { createEventBroker } from "../../apps/api/src/stream/broker";

const ORG_ID = "org_acme";
const USER_ID = "usr_priya";
const TOKEN = "demo_token_acme_corp_2026";
const CHANGE_ID = "chg_2026_05_22_notion";
const NOW = new Date("2026-05-23T13:18:00.000Z");

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
    seedData: { tokens: [token] },
    now: () => NOW,
  });

  return { app, change, reports, events };
}

describe("change.escalated SSE event", () => {
  it("publishes change.escalated when /escalate succeeds", async () => {
    const { app, change, events } = createHarness();
    const received: StoredStreamEvent[] = [];
    events.subscribe(ORG_ID, (event) => {
      received.push(event);
    });

    const response = await app.request(`/v1/changes/${change.id}/escalate`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({ toRole: "legal", note: "Needs counsel" }),
    });

    expect(response.status).toBe(200);

    const escalated = received.find((e) => e.event === "change.escalated");
    expect(escalated).toBeDefined();
    expect(escalated?.orgId).toBe(ORG_ID);
    expect(escalated?.data).toMatchObject({
      id: change.id,
      toRole: "legal",
      byUserId: USER_ID,
      at: NOW.toISOString(),
      slackChannel: "#legal-channel",
    });
    const jiraKey = (escalated?.data as { jiraKey: string }).jiraKey;
    expect(jiraKey).toMatch(/^UNS-\d{4}$/);
  });

  it("does not publish change.escalated when /escalate fails validation", async () => {
    const { app, change, events } = createHarness();
    const received: StoredStreamEvent[] = [];
    events.subscribe(ORG_ID, (event) => {
      received.push(event);
    });

    const response = await app.request(`/v1/changes/${change.id}/escalate`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({ toRole: "not-a-role" }),
    });

    expect(response.status).toBe(422);
    expect(received.find((e) => e.event === "change.escalated")).toBeUndefined();
  });

  it("does not publish change.escalated when the change is missing", async () => {
    const { app, events } = createHarness();
    const received: StoredStreamEvent[] = [];
    events.subscribe(ORG_ID, (event) => {
      received.push(event);
    });

    const response = await app.request("/v1/changes/chg_missing/escalate", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({ toRole: "security" }),
    });

    expect(response.status).toBe(404);
    expect(received.find((e) => e.event === "change.escalated")).toBeUndefined();
  });
});
