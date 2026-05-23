import { z } from "zod";
import type { StreamEventDataMap, StreamEventName } from "./types.js";

export const iso8601Schema = z.iso.datetime({ offset: true });

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
      severity: z.enum(["P1", "P2", "P3"]),
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

export function parseStreamEventData<TName extends StreamEventName>(
  eventName: TName,
  data: unknown,
): StreamEventDataMap[TName] {
  return streamEventSchemas[eventName].parse(data) as StreamEventDataMap[TName];
}
