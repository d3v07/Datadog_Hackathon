import { describe, expect, it } from "vitest";
import { routeChangeReport } from "../../apps/api/src/agent/router";
import { createActionRepository } from "../../apps/api/src/db/actions";
import { createInMemoryEventPublisher } from "../../apps/api/src/stream/events";
import { createChangeReport, createUsers, createVendor, NOW, ORG_ID } from "./support/fixtures";
import type { SlackPayload } from "@redline/shared";

describe("Action routing", () => {
  it("resolves slack:@vendorOwner, delivers the webhook, persists the action, and emits action.delivered", async () => {
    const actions = createActionRepository({ now: () => new Date(NOW) });
    const events = createInMemoryEventPublisher({ now: () => new Date(NOW) });
    const posted: SlackPayload[] = [];

    const routed = await routeChangeReport({
      changeReport: createChangeReport(),
      vendor: createVendor(),
      users: createUsers(),
      routes: ["slack:@vendorOwner"],
      actions,
      events,
      baseUrl: "https://redline.example",
      slack: {
        async postAlert(payload) {
          posted.push(payload);
          return { externalId: "slack_msg_1716482538.000200" };
        },
      },
    });

    expect(routed).toHaveLength(1);
    expect(routed[0]).toMatchObject({
      kind: "slack",
      target: "@U010PRIYA",
      status: "delivered",
      externalId: "slack_msg_1716482538.000200",
      firedAt: NOW,
    });
    expect(posted[0]?.recipient).toBe("@U010PRIYA");
    expect(actions.listByChangeReport(createChangeReport().id)).toEqual(routed);
    expect(events.list(ORG_ID)).toEqual([
      expect.objectContaining({
        event: "action.delivered",
        data: {
          actionId: "act_000001",
          changeReportId: "chg_notion_001",
          kind: "slack",
          status: "delivered",
          externalId: "slack_msg_1716482538.000200",
        },
      }),
    ]);
  });

  it("persists failed Slack delivery and emits a failed action event without throwing", async () => {
    const actions = createActionRepository({ now: () => new Date(NOW) });
    const events = createInMemoryEventPublisher({ now: () => new Date(NOW) });

    const routed = await routeChangeReport({
      changeReport: createChangeReport(),
      vendor: createVendor(),
      users: createUsers(),
      routes: ["slack:#redline-demo"],
      actions,
      events,
      baseUrl: "https://redline.example",
      slack: {
        async postAlert() {
          throw new Error("Slack webhook returned 500");
        },
      },
    });

    expect(routed).toEqual([
      expect.objectContaining({
        kind: "slack",
        target: "#redline-demo",
        status: "failed",
        error: "Slack webhook returned 500",
      }),
    ]);
    expect(actions.all()).toHaveLength(1);
    expect(events.list(ORG_ID)[0]).toMatchObject({
      event: "action.delivered",
      data: {
        actionId: "act_000001",
        changeReportId: "chg_notion_001",
        kind: "slack",
        status: "failed",
      },
    });
  });

  it("persists typed Jira, Email, and Calendar actions without calling Slack", async () => {
    const actions = createActionRepository({ now: () => new Date(NOW) });
    const events = createInMemoryEventPublisher({ now: () => new Date(NOW) });
    let slackCalls = 0;

    const routed = await routeChangeReport({
      changeReport: createChangeReport(),
      vendor: createVendor(),
      users: createUsers(),
      routes: ["jira:SEC", "email:ciso@example.com", "calendar:renewal-prep"],
      actions,
      events,
      baseUrl: "https://redline.example",
      now: () => new Date(NOW),
      slack: {
        async postAlert() {
          slackCalls += 1;
          return {};
        },
      },
    });

    expect(slackCalls).toBe(0);
    expect(routed.map((action) => action.kind)).toEqual(["jira", "email", "calendar"]);
    expect(routed.map((action) => action.status)).toEqual(["queued", "queued", "queued"]);
    expect(routed[0]).toMatchObject({
      target: "SEC",
      externalId: "SEC-1247",
      payload: {
        projectKey: "SEC",
        issueType: "Task",
        priority: "P1",
        labels: ["redline", "vendor-risk", "notion"],
        assigneeUserId: "usr_priya",
      },
    });
    expect(routed[1]).toMatchObject({
      target: "ciso@example.com",
      externalId: "email_chg_notion_001",
      payload: {
        to: "ciso@example.com",
        subject: "P1 Redline alert: Notion",
      },
    });
    expect(routed[2]).toMatchObject({
      target: "renewal-prep",
      externalId: "cal_chg_notion_001",
      payload: {
        title: "Redline renewal-prep: Notion",
        startsAt: "2026-05-24T13:14:42.000Z",
        endsAt: "2026-05-24T13:44:42.000Z",
        attendees: ["priya@example.com"],
      },
    });
    expect(events.list(ORG_ID).map((event) => event.data)).toEqual([
      {
        actionId: "act_000001",
        changeReportId: "chg_notion_001",
        kind: "jira",
        status: "queued",
        externalId: "SEC-1247",
      },
      {
        actionId: "act_000002",
        changeReportId: "chg_notion_001",
        kind: "email",
        status: "queued",
        externalId: "email_chg_notion_001",
      },
      {
        actionId: "act_000003",
        changeReportId: "chg_notion_001",
        kind: "calendar",
        status: "queued",
        externalId: "cal_chg_notion_001",
      },
    ]);
  });
});
