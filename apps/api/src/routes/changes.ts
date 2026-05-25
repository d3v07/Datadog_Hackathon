import { Hono, type Context } from "hono";
import {
  acknowledgeChangeRequestSchema,
  escalateChangeRequestSchema,
  resolveChangeRequestSchema,
  snoozeChangeRequestSchema,
  type AcknowledgeChangeResponse,
  type ChangeReport,
  type ChangeReportId,
  type EscalateChangeResponse,
  type EscalationRecord,
  type ResolveChangeResponse,
  type SnoozeChangeResponse,
  type UserId,
} from "@unsyphn/shared";
import type { ZodType } from "zod";
import type { ChangeReportRepository } from "../db/changeReports.js";
import { errorResponse } from "../errors.js";
import { toFeedChange } from "../lib/change-report-views.js";
import { getSeededChangeReports } from "../seed/loader.js";
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

function stateMetadata(payload: { note?: string | undefined }, userId: UserId): Pick<ChangeReport, "stateChangedBy" | "stateNote"> {
  return {
    stateChangedBy: userId,
    ...(payload.note === undefined ? {} : { stateNote: payload.note }),
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

  // /feed must be registered before /:id so it isn't swallowed by the param route
  router.get("/feed", (c) => {
    const vendorId = c.req.query("vendorId");
    const category = c.req.query("category");

    let changes = getSeededChangeReports().map(toFeedChange);

    if (vendorId) {
      changes = changes.filter((ch) => ch.vendorId === vendorId);
    }

    if (category && category !== "all") {
      changes = changes.filter((ch) => ch.category === category);
    }

    changes.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

    return c.json({ changes });
  });

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
        ...stateMetadata(payload, userId),
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
        ...stateMetadata(payload, userId),
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
        ...stateMetadata(payload, userId),
      }),
    });
  });

  router.post("/:id/escalate", async (c) => {
    const auth = c.get("auth");
    const parsed = escalateChangeRequestSchema.safeParse(await readJsonBody(c));
    if (!parsed.success) {
      return errorResponse(c, 422, "unprocessable", "Request body is invalid", parsed.error.flatten());
    }

    const id = c.req.param("id") as ChangeReportId;
    const current = await deps.reports.getLatest(auth.orgId, id);
    if (!current) {
      return errorResponse(c, 404, "not-found", "Change id not in org");
    }

    const at = (deps.now ?? (() => new Date()))();
    const { toRole, note } = parsed.data;
    const jiraKey = `UNS-${Math.floor(1000 + Math.random() * 9000)}`;
    const escalation: EscalationRecord = {
      toRole,
      byUserId: auth.userId,
      ...(note ? { note } : {}),
      escalatedAt: at.toISOString(),
      slackChannel: `#${toRole}-channel`,
      jiraKey,
    };

    await deps.reports.addEscalation(id, escalation);

    const response: EscalateChangeResponse = { id, escalation };
    return c.json(response);
  });

  router.get("/:id/escalations", async (c) => {
    const auth = c.get("auth");
    const id = c.req.param("id") as ChangeReportId;
    const current = await deps.reports.getLatest(auth.orgId, id);
    if (!current) {
      return errorResponse(c, 404, "not-found", "Change id not in org");
    }
    const escalations = await deps.reports.listEscalations(id);
    return c.json({ id, escalations });
  });

  // TODO(phase-2-E): comment thread endpoints
  //   POST /:id/comments  body { body: string }
  //   GET  /:id/comments  -> { comments: Array<{ id, userId, body, postedAt }> }
  // In-memory map analogous to escalations on the repo. Deferred from Phase 2.

  return router;
}
