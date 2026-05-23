import type {
  Action,
  ActionDraft,
  CalendarPayload,
  ChangeReport,
  EmailPayload,
  JiraPayload,
  OrgId,
  SlackPayload,
  User,
  Vendor,
} from "@redline/shared";
import type { ActionRepository } from "../db/actions.js";
import { publishActionDelivered, type EventPublisher } from "../stream/events.js";
import { createSlackProvider, renderSlackAlert, type SlackProvider } from "../providers/slack.js";

export interface RouteChangeReportInput {
  changeReport: ChangeReport;
  vendor: Vendor;
  users: User[];
  routes: string[];
  actions: ActionRepository;
  events?: EventPublisher;
  slack?: SlackProvider;
  baseUrl?: string;
  now?: () => Date;
}

export interface ParsedRoute {
  kind: "slack" | "jira" | "email" | "calendar";
  target: string;
}

export async function routeChangeReport(input: RouteChangeReportInput): Promise<Action[]> {
  assertSameOrg(input.changeReport.orgId, input.vendor.orgId, "vendor");
  const routed: Action[] = [];

  for (const route of input.routes) {
    const parsed = parseRoute(route);
    const action = await routeOne(input, parsed);
    routed.push(action);
  }

  return routed;
}

export function parseRoute(route: string): ParsedRoute {
  const delimiter = route.indexOf(":");
  if (delimiter <= 0 || delimiter === route.length - 1) {
    throw new Error(`Invalid route: ${route}`);
  }

  const kind = route.slice(0, delimiter);
  const target = route.slice(delimiter + 1);

  if (kind !== "slack" && kind !== "jira" && kind !== "email" && kind !== "calendar") {
    throw new Error(`Unsupported route kind: ${kind}`);
  }

  return { kind, target };
}

async function routeOne(input: RouteChangeReportInput, route: ParsedRoute): Promise<Action> {
  switch (route.kind) {
    case "slack":
      return routeSlack(input, route.target);
    case "jira":
      return persistAndEmit(input, {
        orgId: input.changeReport.orgId,
        changeReportId: input.changeReport.id,
        kind: "jira",
        target: route.target,
        payload: createJiraPayload(input, route.target),
        status: "queued",
        externalId: `${route.target}-1247`,
      });
    case "email":
      return persistAndEmit(input, {
        orgId: input.changeReport.orgId,
        changeReportId: input.changeReport.id,
        kind: "email",
        target: route.target,
        payload: createEmailPayload(input, route.target),
        status: "queued",
        externalId: `email_${input.changeReport.id}`,
      });
    case "calendar":
      return persistAndEmit(input, {
        orgId: input.changeReport.orgId,
        changeReportId: input.changeReport.id,
        kind: "calendar",
        target: route.target,
        payload: createCalendarPayload(input, route.target),
        status: "queued",
        externalId: `cal_${input.changeReport.id}`,
      });
  }
}

async function routeSlack(input: RouteChangeReportInput, rawTarget: string): Promise<Action> {
  const resolution = resolveSlackTarget(rawTarget, input.vendor, input.users);
  if (!resolution.ok) {
    return persistAndEmit(input, {
      orgId: input.changeReport.orgId,
      changeReportId: input.changeReport.id,
      kind: "slack",
      target: rawTarget,
      payload: createFailedSlackPayload(input, rawTarget),
      status: "failed",
      error: resolution.error,
    });
  }

  const payload = renderSlackAlert({
    changeReport: input.changeReport,
    vendor: input.vendor,
    target: resolution.target,
    baseUrl: input.baseUrl ?? process.env.REDLINE_BASE_URL ?? "http://localhost:8787",
  });
  const slack = input.slack ?? createSlackProvider();

  try {
    const delivered = await slack.postAlert(payload);
    return persistAndEmit(input, {
      orgId: input.changeReport.orgId,
      changeReportId: input.changeReport.id,
      kind: "slack",
      target: resolution.target,
      payload,
      status: "delivered",
      ...(delivered.externalId ? { externalId: delivered.externalId } : {}),
    });
  } catch (error) {
    return persistAndEmit(input, {
      orgId: input.changeReport.orgId,
      changeReportId: input.changeReport.id,
      kind: "slack",
      target: resolution.target,
      payload,
      status: "failed",
      error: errorMessage(error),
    });
  }
}

function resolveSlackTarget(rawTarget: string, vendor: Vendor, users: User[]): { ok: true; target: string } | { ok: false; error: string } {
  if (rawTarget === "@vendorOwner") {
    const owner = users.find((user) => user.id === vendor.ownerId && user.orgId === vendor.orgId);
    if (!owner) {
      return { ok: false, error: `Vendor owner ${vendor.ownerId} was not found` };
    }
    if (!owner.slackUserId) {
      return { ok: false, error: `Vendor owner ${vendor.ownerId} has no Slack user id` };
    }

    return { ok: true, target: `@${owner.slackUserId}` };
  }

  return { ok: true, target: rawTarget };
}

async function persistAndEmit(input: RouteChangeReportInput, draft: ActionDraft): Promise<Action> {
  const action = input.actions.insert(draft);
  await publishActionDelivered(input.events, action);
  return action;
}

function createJiraPayload(input: RouteChangeReportInput, projectKey: string): JiraPayload {
  return {
    projectKey,
    issueType: "Task",
    summary: `${input.changeReport.severity}: ${input.vendor.name} - ${input.changeReport.headline}`,
    description: createPlainTextBody(input),
    priority: input.changeReport.severity,
    labels: ["redline", "vendor-risk", input.vendor.name.toLowerCase().replace(/\s+/g, "-")],
    assigneeUserId: input.vendor.ownerId,
  };
}

function createEmailPayload(input: RouteChangeReportInput, to: string): EmailPayload {
  const subject = `${input.changeReport.severity} Redline alert: ${input.vendor.name}`;
  const text = createPlainTextBody(input);

  return {
    to,
    subject,
    text,
    html: `<h1>${escapeHtml(subject)}</h1><p>${escapeHtml(input.changeReport.headline)}</p><p>${escapeHtml(text)}</p>`,
  };
}

function createCalendarPayload(input: RouteChangeReportInput, eventKind: string): CalendarPayload {
  const owner = input.users.find((user) => user.id === input.vendor.ownerId && user.orgId === input.vendor.orgId);
  const startsAt = addMinutes(input.now?.() ?? new Date(), 24 * 60);
  const endsAt = addMinutes(startsAt, 30);

  return {
    title: `Redline ${eventKind}: ${input.vendor.name}`,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    attendees: owner?.email ? [owner.email] : [],
    description: createPlainTextBody(input),
  };
}

function createFailedSlackPayload(input: RouteChangeReportInput, target: string): SlackPayload {
  return renderSlackAlert({
    changeReport: input.changeReport,
    vendor: input.vendor,
    target,
    baseUrl: input.baseUrl ?? process.env.REDLINE_BASE_URL ?? "http://localhost:8787",
  });
}

function createPlainTextBody(input: RouteChangeReportInput): string {
  const change = input.changeReport.changes[0]?.summary ?? input.changeReport.headline;
  const citation = input.changeReport.citations[0];
  const citationText = citation ? ` Citation: ${citation.label} (${citation.sourceUrl}).` : "";

  return `${input.vendor.name}: ${change}. Policy: ${input.changeReport.policyFired.name}.${citationText}`;
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function assertSameOrg(expected: OrgId, actual: OrgId, label: string): void {
  if (expected !== actual) {
    throw new Error(`ChangeReport org does not match ${label} org`);
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
