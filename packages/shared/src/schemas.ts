import { z } from "zod";
import type {
  Action,
  ActionDeliveryStatus,
  ActionId,
  CalendarPayload,
  ChangeReportId,
  EmailPayload,
  JiraPayload,
  OrgId,
  SlackPayload,
  StreamEventDataMap,
  StreamEventName,
} from "./types.js";

export const iso8601Schema = z.iso.datetime({ offset: true });
export const orgIdSchema = z.string().min(1) as unknown as z.ZodType<OrgId>;
export const actionIdSchema = z.string().min(1) as unknown as z.ZodType<ActionId>;
export const changeReportIdSchema = z.string().min(1) as unknown as z.ZodType<ChangeReportId>;

export const actionDeliveryStatusSchema = z.enum(["queued", "delivered", "failed"]) as z.ZodType<ActionDeliveryStatus>;
export const actionStatusSchema = z.enum(["queued", "delivered", "failed", "acknowledged"]);
export const actionKindSchema = z.enum(["slack", "jira", "email", "calendar", "draft", "payment"]);
export const routedActionKindSchema = z.enum(["slack", "jira", "email", "calendar"]);
export const severitySchema = z.enum(["P1", "P2", "P3"]);

const slackTextObjectSchema = z
  .object({
    type: z.enum(["plain_text", "mrkdwn"]),
    text: z.string().min(1),
    emoji: z.boolean().optional(),
  })
  .strict();

const slackBlockSchema = z
  .object({
    type: z.string().min(1),
    text: slackTextObjectSchema.optional(),
    fields: z.array(slackTextObjectSchema).optional(),
    elements: z.array(z.unknown()).optional(),
  })
  .catchall(z.unknown());

export const slackPayloadSchema = z
  .object({
    text: z.string().min(1),
    blocks: z.array(slackBlockSchema).min(1),
    recipient: z.string().min(1).optional(),
    changeReportUrl: z.url(),
    evidenceUrl: z.url().optional(),
  })
  .strict() as z.ZodType<SlackPayload>;

export const jiraPayloadSchema = z
  .object({
    projectKey: z.string().min(1),
    issueType: z.string().min(1),
    summary: z.string().min(1),
    description: z.string().min(1),
    priority: z.string().min(1),
    labels: z.array(z.string().min(1)),
    assigneeUserId: z.string().min(1).optional(),
  })
  .strict() as z.ZodType<JiraPayload>;

export const emailPayloadSchema = z
  .object({
    to: z.email(),
    subject: z.string().min(1),
    html: z.string().min(1),
    text: z.string().min(1),
  })
  .strict() as z.ZodType<EmailPayload>;

export const calendarPayloadSchema = z
  .object({
    title: z.string().min(1),
    startsAt: iso8601Schema,
    endsAt: iso8601Schema,
    attendees: z.array(z.email()).min(1),
    description: z.string().min(1),
    location: z.string().min(1).optional(),
  })
  .strict() as z.ZodType<CalendarPayload>;

const baseActionSchema = {
  id: actionIdSchema,
  orgId: orgIdSchema,
  changeReportId: changeReportIdSchema.optional(),
  target: z.string().min(1),
  firedAt: iso8601Schema,
  status: actionStatusSchema,
  externalId: z.string().min(1).optional(),
  error: z.string().min(1).optional(),
};

export const slackActionSchema = z
  .object({
    ...baseActionSchema,
    kind: z.literal("slack"),
    payload: slackPayloadSchema,
  })
  .strict();

export const jiraActionSchema = z
  .object({
    ...baseActionSchema,
    kind: z.literal("jira"),
    payload: jiraPayloadSchema,
  })
  .strict();

export const emailActionSchema = z
  .object({
    ...baseActionSchema,
    kind: z.literal("email"),
    payload: emailPayloadSchema,
  })
  .strict();

export const calendarActionSchema = z
  .object({
    ...baseActionSchema,
    kind: z.literal("calendar"),
    payload: calendarPayloadSchema,
  })
  .strict();

export const actionSchema = z.discriminatedUnion("kind", [
  slackActionSchema,
  jiraActionSchema,
  emailActionSchema,
  calendarActionSchema,
]) as z.ZodType<Action>;

export const streamEventSchemas = {
  "scheduler.tick": z
    .object({
      vendorId: z.string().min(1),
      runId: z.string().min(1),
      startedAt: iso8601Schema,
    })
    .strict(),
  "run.stage": z
    .object({
      runId: z.string().min(1),
      stage: z.enum(["fetch", "diff", "reason", "classify", "route", "publish"]),
      status: z.enum(["started", "completed", "failed", "skipped"]),
      durationMs: z.number().int().nonnegative().optional(),
    })
    .strict(),
  "change.detected": z
    .object({
      changeReportId: z.string().min(1),
      vendorId: z.string().min(1),
      severity: severitySchema,
      headline: z.string().min(1),
    })
    .strict(),
  "action.delivered": z
    .object({
      actionId: z.string().min(1),
      changeReportId: z.string().min(1),
      kind: actionKindSchema,
      status: actionDeliveryStatusSchema,
      externalId: z.string().min(1).optional(),
    })
    .strict(),
  "change.stateChanged": z
    .object({
      changeReportId: z.string().min(1),
      state: z.enum(["new", "acknowledged", "in-progress", "resolved", "snoozed"]),
      by: z.string().min(1),
    })
    .strict(),
  "org.entitlements.changed": z
    .object({
      compliancePack: z.boolean(),
      changedAt: iso8601Schema,
    })
    .strict(),
} satisfies Record<StreamEventName, z.ZodType>;

export function parseAction(action: unknown): Action {
  return actionSchema.parse(action);
}

export function parseStreamEventData<TName extends StreamEventName>(
  eventName: TName,
  data: unknown,
): StreamEventDataMap[TName] {
  return streamEventSchemas[eventName].parse(data) as StreamEventDataMap[TName];
}
