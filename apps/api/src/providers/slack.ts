import type { ChangeReport, SlackPayload, Vendor } from "@redline/shared";
import { slackPayloadSchema } from "@redline/shared";

export interface SlackRenderInput {
  changeReport: ChangeReport;
  vendor: Vendor;
  target: string;
  baseUrl: string;
}

export interface SlackPostInput {
  webhookUrl?: string;
  payload: SlackPayload;
  fetchFn?: typeof fetch;
}

export interface SlackPostResult {
  externalId?: string;
}

export interface SlackProvider {
  postAlert(payload: SlackPayload): Promise<SlackPostResult>;
}

export interface SlackProviderOptions {
  webhookUrl?: string;
  fetchFn?: typeof fetch;
}

export class SlackDeliveryError extends Error {
  readonly provider = "slack";
  readonly status?: number;
  readonly responseBody?: string;

  constructor(message: string, details: { status?: number; responseBody?: string } = {}) {
    super(message);
    this.name = "SlackDeliveryError";
    if (details.status !== undefined) {
      this.status = details.status;
    }
    if (details.responseBody !== undefined) {
      this.responseBody = details.responseBody;
    }
  }
}

export function createSlackProvider(options: SlackProviderOptions = {}): SlackProvider {
  return {
    postAlert(payload) {
      const webhookUrl = options.webhookUrl ?? process.env.SLACK_WEBHOOK_URL;
      return postSlackAlert({
        payload,
        ...(webhookUrl ? { webhookUrl } : {}),
        ...(options.fetchFn ? { fetchFn: options.fetchFn } : {}),
      });
    },
  };
}

export function renderSlackAlert(input: SlackRenderInput): SlackPayload {
  const changeReportUrl = `${trimTrailingSlash(input.baseUrl)}/changes/${input.changeReport.id}`;
  const citations = reportCitations(input.changeReport);
  const evidenceUrl = input.changeReport.evidenceUrl ?? input.changeReport.sensoUrl ?? citationUrl(citations[0]);
  const heroChange = input.changeReport.changes[0];
  const annualImpact = input.changeReport.changes.find((change) => change.dollarImpact)?.dollarImpact?.annualUsd;
  const citation = citations[0];
  const headline = input.changeReport.headline ?? input.changeReport.recommendation.copy;
  const policyName = input.changeReport.policyFired?.name ?? input.changeReport.policyFiredId;
  const targetPrefix = input.target.startsWith("@") ? `<${input.target}> ` : "";
  const payload: SlackPayload = {
    text: `${input.changeReport.severity} Redline alert for ${input.vendor.name}: ${headline}`,
    recipient: input.target,
    changeReportUrl,
    ...(evidenceUrl ? { evidenceUrl } : {}),
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `${input.changeReport.severity} · ${input.vendor.name} · Redline alert`,
          emoji: true,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${targetPrefix}*${heroChange?.summary ?? headline}*\n_Policy: ${policyName}_`,
        },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Vendor*\n${input.vendor.name}` },
          { type: "mrkdwn", text: `*Severity*\n${input.changeReport.severity}` },
          { type: "mrkdwn", text: `*Impact*\n${formatImpact(annualImpact)}` },
          { type: "mrkdwn", text: `*Citation*\n${citation ? citationLabel(citation) : "Not attached"}` },
        ],
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: citation ? `${citationSnippet(citation)} · ${citationUrl(citation)}` : "No citation attached",
          },
        ],
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "Open in Redline" },
            url: changeReportUrl,
            style: "primary",
          },
          ...(evidenceUrl
            ? [
                {
                  type: "button",
                  text: { type: "plain_text", text: "View evidence" },
                  url: evidenceUrl,
                },
              ]
            : []),
        ],
      },
    ],
  };

  return slackPayloadSchema.parse(payload);
}

export async function postSlackAlert(input: SlackPostInput): Promise<SlackPostResult> {
  if (!input.webhookUrl) {
    throw new SlackDeliveryError("SLACK_WEBHOOK_URL is not configured");
  }

  const fetchFn = input.fetchFn ?? fetch;
  const response = await fetchFn(input.webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      text: input.payload.text,
      blocks: input.payload.blocks,
    }),
  });

  if (!response.ok) {
    const responseBody = await response.text();
    throw new SlackDeliveryError("Slack webhook returned a non-2xx response", {
      status: response.status,
      responseBody,
    });
  }

  const externalId = response.headers.get("x-slack-msg-id") ?? response.headers.get("x-slack-request-id") ?? undefined;
  return externalId ? { externalId } : {};
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function reportCitations(report: ChangeReport) {
  return report.citations ?? report.changes.flatMap((change) => change.citations ?? []);
}

function citationLabel(citation: NonNullable<ChangeReport["citations"]>[number]): string {
  return citation.label ?? citation.section ?? "Source";
}

function citationSnippet(citation: NonNullable<ChangeReport["citations"]>[number]): string {
  return citation.snippet ?? citation.quote ?? "Evidence captured";
}

function citationUrl(citation: NonNullable<ChangeReport["citations"]>[number] | undefined): string | undefined {
  return citation?.sourceUrl ?? citation?.url;
}

function formatImpact(amount?: number): string {
  if (amount === undefined) {
    return "No dollar impact";
  }

  return `${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount)}/yr`;
}
