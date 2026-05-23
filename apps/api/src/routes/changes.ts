import { Hono, type Context } from "hono";
import {
  acknowledgeChangeRequestSchema,
  resolveChangeRequestSchema,
  snoozeChangeRequestSchema,
  type AcknowledgeChangeResponse,
  type ChangeReport,
  type ChangeReportId,
  type ResolveChangeResponse,
  type SnoozeChangeResponse,
  type UserId,
} from "@redline/shared";
import type { ZodType } from "zod";
import type { ChangeReportRepository } from "../db/changeReports.js";
import { errorResponse } from "../errors.js";
import type { EventBroker } from "../stream/broker.js";

export interface ChangesRouteDeps {
  reports: ChangeReportRepository;
  events: EventBroker;
  now?: () => Date;
}

type MutationKind = "acknowledge" | "snooze" | "resolve";
type AcknowledgedReport = ChangeReport & { state: "acknowledged"; acknowledgedAt: string };
type SnoozedReport = ChangeReport & { state: "snoozed"; snoozedUntil: string };
type ResolvedReport = ChangeReport & { state: "resolved"; resolution: NonNullable<ChangeReport["resolution"]>; resolvedAt: string };
type MutatedChangeReport = AcknowledgedReport | SnoozedReport | ResolvedReport;

async function readJsonBody(c: Context): Promise<unknown> {
  const text = await c.req.text();
  if (text.trim() === "") {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function nextVersion(report: ChangeReport, now: Date): ChangeReport {
  return {
    ...report,
    updatedAt: now.toISOString(),
    version: report.version + 1,
  };
}

function assertTransitionAllowed(report: ChangeReport, mutation: MutationKind): string | null {
  if (mutation === "acknowledge") {
    return report.state === "new" ? null : "Change is already acknowledged or in a later state";
  }

  if (mutation === "snooze") {
    return report.state === "resolved" || report.state === "snoozed"
      ? "Change cannot be snoozed from its current state"
      : null;
  }

  return report.state === "resolved" ? "Change is already resolved" : null;
}

function validateSnoozeWindow(untilAt: string, now: Date): string | null {
  const untilMs = Date.parse(untilAt);
  const nowMs = now.getTime();

  if (!Number.isFinite(untilMs) || untilMs <= nowMs) {
    return "untilAt must be in the future";
  }

  const maxUntilMs = nowMs + 30 * 24 * 60 * 60 * 1000;
  return untilMs > maxUntilMs ? "untilAt must be within 30 days" : null;
}

function mutationResponse(report: MutatedChangeReport): AcknowledgeChangeResponse | SnoozeChangeResponse | ResolveChangeResponse {
  switch (report.state) {
    case "acknowledged":
      return { id: report.id, state: "acknowledged", acknowledgedAt: report.acknowledgedAt };
    case "snoozed":
      return { id: report.id, state: "snoozed", snoozedUntil: report.snoozedUntil };
    case "resolved":
      return { id: report.id, state: "resolved", resolution: report.resolution, resolvedAt: report.resolvedAt };
    default: {
      const exhaustive: never = report;
      return exhaustive;
    }
  }
}

interface MutationOptions<TPayload> {
  kind: MutationKind;
  schema: ZodType<TPayload>;
  validate?: (payload: TPayload, at: Date) => string | null;
  apply: (report: ChangeReport, payload: TPayload, at: Date, userId: UserId) => MutatedChangeReport;
}

async function runMutation<TPayload>(c: Context, deps: ChangesRouteDeps, options: MutationOptions<TPayload>) {
  const auth = c.get("auth");
  const parsed = options.schema.safeParse(await readJsonBody(c));
  if (!parsed.success) {
    return errorResponse(c, 422, "unprocessable", "Request body is invalid", parsed.error.flatten());
  }

  const at = (deps.now ?? (() => new Date()))();
  const semanticError = options.validate?.(parsed.data, at);
  if (semanticError) {
    return errorResponse(c, 422, "unprocessable", semanticError);
  }

  const current = await deps.reports.getLatest(auth.orgId, c.req.param("id") as ChangeReportId);
  if (!current) {
    return errorResponse(c, 404, "not-found", "Change id not in org");
  }

  const conflict = assertTransitionAllowed(current, options.kind);
  if (conflict) {
    return errorResponse(c, 409, "conflict", conflict);
  }

  const updated = options.apply(current, parsed.data, at, auth.userId);
  await deps.reports.insertVersion(updated);
  deps.events.publish(auth.orgId, "change.stateChanged", {
    changeReportId: updated.id,
    state: updated.state,
    by: auth.userId,
  });

  return c.json(mutationResponse(updated));
}

export function createChangesRouter(deps: ChangesRouteDeps): Hono {
  const router = new Hono();

  router.get("/:id", async (c) => {
    const auth = c.get("auth");
    const current = await deps.reports.getLatest(auth.orgId, c.req.param("id") as ChangeReportId);

    if (!current) {
      return errorResponse(c, 404, "not-found", "Change id not in org");
    }

    return c.json(current);
  });

  router.post("/:id/acknowledge", async (c) => {
    return runMutation(c, deps, {
      kind: "acknowledge",
      schema: acknowledgeChangeRequestSchema,
      apply: (report, payload, at, userId) => ({
        ...nextVersion(report, at),
        state: "acknowledged",
        acknowledgedAt: at.toISOString(),
        stateNote: payload.note,
        stateChangedBy: userId,
      }),
    });
  });

  router.post("/:id/snooze", async (c) => {
    return runMutation(c, deps, {
      kind: "snooze",
      schema: snoozeChangeRequestSchema,
      validate: (payload, at) => validateSnoozeWindow(payload.untilAt, at),
      apply: (report, payload, at, userId) => ({
        ...nextVersion(report, at),
        state: "snoozed",
        snoozedUntil: payload.untilAt,
        stateNote: payload.note,
        stateChangedBy: userId,
      }),
    });
  });

  router.post("/:id/resolve", async (c) => {
    return runMutation(c, deps, {
      kind: "resolve",
      schema: resolveChangeRequestSchema,
      apply: (report, payload, at, userId) => ({
        ...nextVersion(report, at),
        state: "resolved",
        resolvedAt: at.toISOString(),
        resolution: payload.resolution,
        stateNote: payload.note,
        stateChangedBy: userId,
      }),
    });
  });

  return router;
}
