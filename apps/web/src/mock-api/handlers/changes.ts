// Change report lifecycle + escalations + feed. Mutates store.changeReports in
// place so subsequent inbox/findings reads see the new state.

import type {
  ChangeReport,
  ChangeState,
  Lens,
  Resolution,
} from "@unsyphn/shared";
import { changeReportsForOrg, toFeedChange } from "../projections.js";
import { register } from "../router.js";
import { store, type EscalationRecord } from "../store.js";
import {
  badRequest,
  conflict,
  notFound,
  nowIso,
  ok,
  type MockRequest,
  type MockResponse,
} from "../types.js";

function getReport(orgId: string, id: string): ChangeReport | undefined {
  const report = store.changeReports.get(id);
  if (!report || report.orgId !== orgId) return undefined;
  return report;
}

function bumpVersion(report: ChangeReport, at: string): ChangeReport {
  return { ...report, updatedAt: at, version: report.version + 1 };
}

type Mutation = "acknowledge" | "snooze" | "resolve";

function transitionError(report: ChangeReport, mutation: Mutation): string | null {
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

function feedHandler(req: MockRequest): MockResponse {
  const orgId = req.orgId ?? "org_acme";
  const vendorId = req.query.get("vendorId");
  const category = req.query.get("category");
  let changes = changeReportsForOrg(orgId).map(toFeedChange);
  if (vendorId) changes = changes.filter((c) => c.vendorId === vendorId);
  if (category && category !== "all") {
    changes = changes.filter((c) => c.category === category);
  }
  changes.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  return ok({ changes });
}

function getChange(req: MockRequest, id: string): MockResponse {
  const orgId = req.orgId ?? "org_acme";
  const report = getReport(orgId, id);
  if (!report) return notFound("Change id not in org");
  return ok(report);
}

function acknowledge(req: MockRequest, id: string): MockResponse {
  const orgId = req.orgId ?? "org_acme";
  const current = getReport(orgId, id);
  if (!current) return notFound("Change id not in org");
  const err = transitionError(current, "acknowledge");
  if (err) return conflict(err);
  const at = nowIso();
  const updated: ChangeReport = {
    ...bumpVersion(current, at),
    state: "acknowledged",
    acknowledgedAt: at,
    stateChangedBy: req.userId ?? "system",
  };
  const body = (req.body ?? {}) as { note?: string };
  if (body.note) updated.stateNote = body.note;
  store.changeReports.set(id, updated);
  return ok({ id: updated.id, state: "acknowledged" as ChangeState, acknowledgedAt: at });
}

function snooze(req: MockRequest, id: string): MockResponse {
  const orgId = req.orgId ?? "org_acme";
  const current = getReport(orgId, id);
  if (!current) return notFound("Change id not in org");
  const err = transitionError(current, "snooze");
  if (err) return conflict(err);
  const body = (req.body ?? {}) as { untilAt?: string; note?: string };
  const untilAt = body.untilAt;
  if (!untilAt || Number.isNaN(Date.parse(untilAt))) {
    return badRequest("untilAt is required");
  }
  if (Date.parse(untilAt) <= Date.now()) {
    return badRequest("untilAt must be in the future");
  }
  const at = nowIso();
  const updated: ChangeReport = {
    ...bumpVersion(current, at),
    state: "snoozed",
    snoozedUntil: untilAt,
    stateChangedBy: req.userId ?? "system",
  };
  if (body.note) updated.stateNote = body.note;
  store.changeReports.set(id, updated);
  return ok({ id: updated.id, state: "snoozed" as ChangeState, snoozedUntil: untilAt });
}

function resolve(req: MockRequest, id: string): MockResponse {
  const orgId = req.orgId ?? "org_acme";
  const current = getReport(orgId, id);
  if (!current) return notFound("Change id not in org");
  const err = transitionError(current, "resolve");
  if (err) return conflict(err);
  const body = (req.body ?? {}) as { resolution?: Resolution; note?: string };
  const resolution = body.resolution ?? "accepted";
  const at = nowIso();
  const updated: ChangeReport = {
    ...bumpVersion(current, at),
    state: "resolved",
    resolvedAt: at,
    resolution,
    stateChangedBy: req.userId ?? "system",
  };
  if (body.note) updated.stateNote = body.note;
  store.changeReports.set(id, updated);
  return ok({ id: updated.id, state: "resolved" as ChangeState, resolution, resolvedAt: at });
}

function escalate(req: MockRequest, id: string): MockResponse {
  const orgId = req.orgId ?? "org_acme";
  const current = getReport(orgId, id);
  if (!current) return notFound("Change id not in org");
  const body = (req.body ?? {}) as { toRole?: Lens; note?: string };
  const toRole = body.toRole;
  if (!toRole) return badRequest("toRole is required");
  const escalation: EscalationRecord = {
    toRole,
    byUserId: req.userId ?? "system",
    ...(body.note ? { note: body.note } : {}),
    escalatedAt: nowIso(),
    slackChannel: `#${toRole}-channel`,
    jiraKey: `UNS-${Math.floor(1000 + Math.random() * 9000)}`,
  };
  const list = store.escalations.get(id) ?? [];
  list.push(escalation);
  store.escalations.set(id, list);
  return ok({ id, escalation });
}

function listEscalations(req: MockRequest, id: string): MockResponse {
  const orgId = req.orgId ?? "org_acme";
  if (!getReport(orgId, id)) return notFound("Change id not in org");
  return ok({ id, escalations: store.escalations.get(id) ?? [] });
}

export function registerChangeHandlers(): void {
  // Order matters — /feed must be matched before /:id.
  register("GET", /^\/v1\/changes\/feed$/, feedHandler);
  register("GET", /^\/v1\/changes\/([^/]+)\/escalations$/, (req, p) =>
    listEscalations(req, p[0] ?? ""),
  );
  register("GET", /^\/v1\/changes\/([^/]+)$/, (req, p) => getChange(req, p[0] ?? ""));
  register("POST", /^\/v1\/changes\/([^/]+)\/acknowledge$/, (req, p) =>
    acknowledge(req, p[0] ?? ""),
  );
  register("POST", /^\/v1\/changes\/([^/]+)\/snooze$/, (req, p) =>
    snooze(req, p[0] ?? ""),
  );
  register("POST", /^\/v1\/changes\/([^/]+)\/resolve$/, (req, p) =>
    resolve(req, p[0] ?? ""),
  );
  register("POST", /^\/v1\/changes\/([^/]+)\/escalate$/, (req, p) =>
    escalate(req, p[0] ?? ""),
  );
}
