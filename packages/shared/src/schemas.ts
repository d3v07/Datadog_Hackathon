import { z } from "zod";
import type { StreamEventDataMap, StreamEventName } from "./types.js";

export const iso8601Schema = z.iso.datetime({ offset: true });

export const severitySchema = z.enum(["P1", "P2", "P3"]);
export const changeStateSchema = z.enum(["new", "acknowledged", "in-progress", "resolved", "snoozed"]);
export const resolutionSchema = z.enum(["accepted", "renegotiated", "rejected", "no-action"]);
export const noteSchema = z.string().trim().min(1).max(500);

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

export const citationSchema = z
  .object({
    url: z.url(),
    quote: z.string().min(1),
    section: z.string().min(1).optional(),
    fetchedAt: iso8601Schema,
    country: z.string().min(1).optional(),
  })
  .strict();

export const changeSchema = z
  .object({
    id: z.string().min(1),
    category: z.enum(["data", "pricing", "subprocessor", "terms", "sla", "security"]),
    summary: z.string().min(1).max(140),
    before: z.string(),
    after: z.string(),
    materiality: z.enum(["material", "minor", "cosmetic"]),
    dollarImpact: z
      .object({
        annualUsd: z.number(),
        pctChange: z.number(),
      })
      .strict()
      .optional(),
    citations: z.array(citationSchema).min(1),
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
    policyAlsoMatched: z.array(z.string().min(1)),
    changes: z.array(changeSchema).min(1),
    recommendation: z
      .object({
        action: z.enum(["renegotiate", "escalate", "accept", "reject"]),
        copy: z.string().min(1),
      })
      .strict(),
    sensoUrl: z.url().optional(),
    ownerId: z.string().min(1),
    stateNote: z.string().max(500).optional(),
    stateChangedBy: z.string().min(1).optional(),
    updatedAt: iso8601Schema,
    version: z.number().int().positive(),
  })
  .strict();

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
      kind: z.enum(["slack", "jira", "email", "calendar", "payment"]),
      status: z.enum(["queued", "delivered", "failed"]),
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
  "org.entitlements.changed": z
    .object({
      compliancePack: z.boolean(),
      changedAt: iso8601Schema,
    })
    .strict(),
} satisfies Record<StreamEventName, z.ZodType>;

export type AcknowledgeChangeRequest = z.infer<typeof acknowledgeChangeRequestSchema>;
export type SnoozeChangeRequest = z.infer<typeof snoozeChangeRequestSchema>;
export type ResolveChangeRequest = z.infer<typeof resolveChangeRequestSchema>;

export function parseStreamEventData<TName extends StreamEventName>(
  eventName: TName,
  data: unknown,
): StreamEventDataMap[TName] {
  return streamEventSchemas[eventName].parse(data) as StreamEventDataMap[TName];
}
