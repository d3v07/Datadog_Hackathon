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
export const Iso8601Schema = iso8601Schema;
export const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");

export const orgIdSchema = z.string().min(1) as z.ZodType<OrgId>;
export const actionIdSchema = z.string().min(1) as z.ZodType<ActionId>;
export const changeReportIdSchema = z.string().min(1) as z.ZodType<ChangeReportId>;
export const severitySchema = z.enum(["P1", "P2", "P3"]);
export const SeveritySchema = severitySchema;
export const VendorTierSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);
export const DataClassSchema = z.enum(["pii", "phi", "financial", "content"]);
export const changeStateSchema = z.enum(["new", "acknowledged", "in-progress", "resolved", "snoozed"]);
export const ChangeStateSchema = changeStateSchema;
export const resolutionSchema = z.enum(["accepted", "renegotiated", "rejected", "no-action"]);
export const ResolutionSchema = resolutionSchema;
export const ChangeCategorySchema = z.enum(["data", "pricing", "subprocessor", "terms", "sla", "security"]);
export const MaterialitySchema = z.enum(["material", "minor", "cosmetic"]);
export const noteSchema = z.string().trim().min(1).max(500);
export const actionDeliveryStatusSchema = z.enum(["queued", "delivered", "failed"]) as z.ZodType<ActionDeliveryStatus>;
export const actionStatusSchema = z.enum(["queued", "delivered", "failed", "acknowledged"]);
export const actionKindSchema = z.enum(["slack", "jira", "email", "calendar", "draft", "payment"]);

export const acknowledgeChangeRequestSchema = z
  .object({
    note: noteSchema.optional(),
  })
  .strict();

export const snoozeChangeRequestSchema = z
  .object({
    untilAt: iso8601Schema,
    note: noteSchema.optional(),
  })
  .strict();

export const resolveChangeRequestSchema = z
  .object({
    resolution: resolutionSchema,
    note: noteSchema.optional(),
  })
  .strict();

export const lensSchema = z.enum([
  "procurement",
  "legal",
  "security",
  "finance",
  "it",
  "audit",
]);

export const escalateChangeRequestSchema = z
  .object({
    toRole: lensSchema,
    note: noteSchema.optional(),
  })
  .strict();

export type EscalateChangeRequest = z.infer<typeof escalateChangeRequestSchema>;

export interface EscalationRecord {
  toRole: z.infer<typeof lensSchema>;
  byUserId: string;
  note?: string;
  escalatedAt: string;
  slackChannel: string;
  jiraKey: string;
}

export interface EscalateChangeResponse {
  id: string;
  escalation: EscalationRecord;
}

export const VendorContractSchema = z.object({
  renewsAt: IsoDateSchema,
  annualSpendUsd: z.number().int().nonnegative(),
  seatCount: z.number().int().positive(),
});

export const VendorCreateSchema = z.object({
  name: z.string().trim().min(2, "must be at least 2 characters").max(60),
  homepageUrl: z
    .string()
    .trim()
    .url("must be a valid URL")
    .max(2048)
    .refine((u) => u.startsWith("http://") || u.startsWith("https://"), {
      message: "must be http(s)",
    }),
  ownerId: z.string().min(1),
  tier: VendorTierSchema,
  dataClasses: z.array(DataClassSchema).default([]),
  contract: VendorContractSchema.optional(),
});

export type VendorCreateInput = z.input<typeof VendorCreateSchema>;

export const ErrorCodes = {
  ValidationFailed: "validation-failed",
  Unauthenticated: "unauthenticated",
  Forbidden: "forbidden",
  NotFound: "not-found",
  Conflict: "conflict",
  Duplicate: "duplicate",
  DiscoveryIncomplete: "discovery-incomplete",
  Unprocessable: "unprocessable",
  Internal: "internal",
  UpstreamFailed: "upstream-failed",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export const ApiErrorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
    requestId: z.string().optional(),
  }),
});

export const citationSchema = z
  .object({
    url: z.string().url().optional(),
    quote: z.string().min(1).optional(),
    section: z.string().min(1).optional(),
    fetchedAt: iso8601Schema.optional(),
    country: z.string().min(1).optional(),
    label: z.string().min(1).optional(),
    sourceUrl: z.string().url().optional(),
    snippet: z.string().min(1).optional(),
  })
  .strict();
export const CitationSchema = citationSchema;

export const changeSchema = z
  .object({
    id: z.string().min(1).optional(),
    category: ChangeCategorySchema.optional(),
    summary: z.string().min(1).max(280),
    before: z.string().optional(),
    after: z.string().optional(),
    materiality: MaterialitySchema.optional(),
    dollarImpact: z
      .object({
        annualUsd: z.number(),
        pctChange: z.number().optional(),
      })
      .strict()
      .optional(),
    citations: z.array(citationSchema).optional(),
    action: z.enum(["renegotiate", "escalate", "accept", "reject"]).optional(),
  })
  .strict();
export const ChangeSchema = changeSchema;

export const RecommendationSchema = z
  .object({
    action: z.enum(["renegotiate", "escalate", "accept", "reject"]),
    copy: z.string().min(1),
  })
  .strict();

export const changeReportSchema = z
  .object({
    id: z.string().min(1),
    orgId: z.string().min(1),
    vendorId: z.string().min(1),
    runId: z.string().min(1),
    detectedAt: iso8601Schema,
    severity: severitySchema,
    state: changeStateSchema,
    acknowledgedAt: iso8601Schema.optional(),
    snoozedUntil: iso8601Schema.optional(),
    resolvedAt: iso8601Schema.optional(),
    resolution: resolutionSchema.optional(),
    policyFiredId: z.string().min(1),
    policyAlsoMatched: z.array(z.string().min(1)).default([]),
    changes: z.array(changeSchema).min(1),
    recommendation: RecommendationSchema,
    sensoUrl: z.string().url().optional(),
    ownerId: z.string().min(1),
    stateNote: z.string().max(500).optional(),
    stateChangedBy: z.string().min(1).optional(),
    updatedAt: iso8601Schema,
    version: z.number().int().positive(),
    headline: z.string().min(1).optional(),
    policyFired: z
      .object({
        id: z.string().min(1),
        name: z.string().min(1),
      })
      .strict()
      .optional(),
    evidenceUrl: z.string().url().optional(),
    citations: z.array(citationSchema).optional(),
  })
  .strict();
export const ChangeReportSchema = changeReportSchema;

export const EvidenceBriefResponseSchema = z.object({
  changeReport: changeReportSchema,
  vendor: z.object({
    id: z.string(),
    name: z.string(),
    category: z.string(),
  }),
  policyFired: z.object({ id: z.string(), name: z.string() }),
  policyAlsoMatched: z.array(z.object({ id: z.string(), name: z.string() })),
  actionSummary: z.array(
    z.object({
      kind: actionKindSchema,
      target: z.string(),
      status: actionStatusSchema,
      firedAt: iso8601Schema,
    }),
  ),
});

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
    changeReportUrl: z.string().url(),
    evidenceUrl: z.string().url().optional(),
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
    to: z.string().email(),
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
    attendees: z.array(z.string().email()),
    description: z.string().min(1),
    location: z.string().min(1).optional(),
  })
  .strict() as z.ZodType<CalendarPayload>;

const baseActionSchema = {
  id: actionIdSchema,
  orgId: orgIdSchema,
  changeReportId: changeReportIdSchema,
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
      vendorId: z.string().min(1).optional(),
      stage: z.enum(["fetch", "diff", "reason", "classify", "route", "publish"]),
      status: z.enum(["started", "completed", "failed", "skipped"]),
      durationMs: z.number().int().nonnegative().optional(),
    })
    .strict(),
  "run.completed": z
    .object({
      runId: z.string().min(1),
      vendorId: z.string().min(1),
      status: z.enum(["unchanged", "changed", "failed"]),
      endedAt: iso8601Schema,
      durationMs: z.number().int().nonnegative(),
      changeReportId: z.string().min(1).optional(),
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
      changeReportId: z.string().min(1).optional(),
      kind: actionKindSchema,
      status: actionDeliveryStatusSchema,
      externalId: z.string().min(1).optional(),
    })
    .strict(),
  "change.stateChanged": z
    .object({
      changeReportId: z.string().min(1),
      state: changeStateSchema,
      by: z.string().min(1),
    })
    .strict(),
  "change.escalated": z
    .object({
      id: z.string().min(1),
      toRole: lensSchema,
      byUserId: z.string().min(1),
      at: iso8601Schema,
      slackChannel: z.string().min(1),
      jiraKey: z.string().min(1),
    })
    .strict(),
  "org.entitlements.changed": z
    .object({
      compliancePack: z.boolean(),
      auditorPortal: z.boolean().optional(),
      changedAt: iso8601Schema,
    })
    .strict(),
} satisfies Record<StreamEventName, z.ZodType>;

export const SchedulerTickEventSchema = streamEventSchemas["scheduler.tick"];
export const RunStageEventSchema = streamEventSchemas["run.stage"];
export const RunCompletedEventSchema = streamEventSchemas["run.completed"];

export type AcknowledgeChangeRequest = z.infer<typeof acknowledgeChangeRequestSchema>;
export type SnoozeChangeRequest = z.infer<typeof snoozeChangeRequestSchema>;
export type ResolveChangeRequest = z.infer<typeof resolveChangeRequestSchema>;

export function parseAction(action: unknown): Action {
  return actionSchema.parse(action);
}

export function parseStreamEventData<TName extends StreamEventName>(
  eventName: TName,
  data: unknown,
): StreamEventDataMap[TName] {
  return streamEventSchemas[eventName].parse(data) as StreamEventDataMap[TName];
}
