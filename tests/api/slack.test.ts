import { describe, expect, it } from "vitest";
import { postSlackAlert, renderSlackAlert } from "../../apps/api/src/providers/slack";
import { createChangeReport, createVendor } from "./support/fixtures";

describe("Slack provider", () => {
  it("renders a Block Kit alert with vendor, policy, severity, impact, citation, and action links", () => {
    const payload = renderSlackAlert({
      changeReport: createChangeReport(),
      vendor: createVendor(),
      target: "@U010PRIYA",
      baseUrl: "https://unsyphn.example",
    });
    const rendered = JSON.stringify(payload);

    expect(payload.changeReportUrl).toBe("https://unsyphn.example/changes/chg_notion_001");
    expect(payload.evidenceUrl).toBe("https://senso.example/evidence/chg_notion_001");
    expect(rendered).toContain("P1 · Notion · Unsyphn alert");
    expect(rendered).toContain("Data retention for PII vendors");
    expect(rendered).toContain("$28,400/yr");
    expect(rendered).toContain("Nimble capture");
    expect(rendered).toContain("Open in Unsyphn");
    expect(rendered).toContain("View evidence");
    expect(rendered).toContain("<@U010PRIYA>");
  });

  it("posts Slack payloads to the configured webhook and returns the external message id", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fetchFn: typeof fetch = async (url, init) => {
      calls.push({ url: String(url), init: init ?? {} });
      return new Response("ok", {
        status: 200,
        headers: { "x-slack-msg-id": "slack_msg_1716482538.000200" },
      });
    };
    const payload = renderSlackAlert({
      changeReport: createChangeReport(),
      vendor: createVendor(),
      target: "#unsyphn-demo",
      baseUrl: "https://unsyphn.example",
    });

    await expect(
      postSlackAlert({
        webhookUrl: "https://hooks.slack.com/services/T000/B000/demo",
        payload,
        fetchFn,
      }),
    ).resolves.toEqual({ externalId: "slack_msg_1716482538.000200" });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://hooks.slack.com/services/T000/B000/demo");
    expect(calls[0]?.init.method).toBe("POST");
    expect(JSON.parse(String(calls[0]?.init.body))).toMatchObject({
      text: expect.stringContaining("Unsyphn alert"),
      blocks: expect.any(Array),
    });
  });

  it("surfaces Slack webhook failures with provider context", async () => {
    const fetchFn: typeof fetch = async () => new Response("invalid webhook", { status: 403 });
    const payload = renderSlackAlert({
      changeReport: createChangeReport(),
      vendor: createVendor(),
      target: "#unsyphn-demo",
      baseUrl: "https://unsyphn.example",
    });

    await expect(
      postSlackAlert({
        webhookUrl: "https://hooks.slack.com/services/T000/B000/demo",
        payload,
        fetchFn,
      }),
    ).rejects.toMatchObject({
      name: "SlackDeliveryError",
      provider: "slack",
      status: 403,
      responseBody: "invalid webhook",
    });
  });
});
