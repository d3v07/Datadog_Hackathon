// Intake requests — list, create, decide, comment. Mirrors apps/api routes
// including the DTO envelope and SLA escalation derived state.

import { register } from "../router.js";
import {
  store,
  type IntakeRequestRecord,
  type RequestStatus,
} from "../store.js";
import {
  badRequest,
  created,
  newId,
  notFound,
  nowIso,
  ok,
  type MockRequest,
  type MockResponse,
} from "../types.js";

const VALID_STATUSES: ReadonlyArray<RequestStatus> = [
  "pending",
  "approved",
  "rejected",
  "routed",
];
const ROUTE_TARGETS = ["legal", "security", "finance", "procurement", "it", "audit"] as const;
type RouteTarget = (typeof ROUTE_TARGETS)[number];

const SLA_WINDOW_MS = 48 * 60 * 60 * 1000;
const LENS_CATEGORIES: Record<string, ReadonlyArray<string>> = {
  procurement: [],
  legal: ["contracts", "dpa", "compliance", "data"],
  security: ["security", "data", "infrastructure"],
  finance: ["payments", "analytics", "spend"],
  it: ["infrastructure", "productivity", "devtools"],
  audit: [],
};

function avatarLetter(name: string | undefined, fallback: string): string {
  const src = name && name.length > 0 ? name : fallback;
  return src.charAt(0).toUpperCase();
}

function toDto(record: IntakeRequestRecord): Record<string, unknown> {
  const requester = store.users.get(record.requesterId);
  const approver = record.approverId ? store.users.get(record.approverId) : undefined;
  const requesterName = requester?.name ?? record.requesterId;
  const submittedMs = Date.parse(record.submittedAt);
  const slaDueAt = new Date(submittedMs + SLA_WINDOW_MS).toISOString();
  const autoEscalated =
    record.status === "pending" && Date.now() - submittedMs > SLA_WINDOW_MS;

  const comments = record.comments.map((c) => {
    const author = store.users.get(c.by);
    return {
      id: c.id,
      by: c.by,
      at: c.at,
      text: c.text,
      authorName: author?.name ?? c.by,
      authorLetter: avatarLetter(author?.name, c.by),
    };
  });

  const dto: Record<string, unknown> = {
    id: record.id,
    vendorName: record.vendorName,
    requesterEmail: requester?.email ?? "requester@acme.dev",
    expectedSpendUsd: record.expectedSpendUsd,
    justification: record.justification,
    status: record.status,
    similarTools: record.similarTools,
    createdAt: record.submittedAt,
    category: record.category,
    comments,
    requesterId: record.requesterId,
    requesterName,
    autoEscalated,
    slaDueAt,
  };
  if (record.approverId !== undefined) dto.approverId = record.approverId;
  if (approver?.name) dto.approverName = approver.name;
  if (record.decidedAt !== undefined) dto.decidedAt = record.decidedAt;
  if (record.routeTo !== undefined) dto.routeTo = record.routeTo;
  return dto;
}

function matchesLens(record: IntakeRequestRecord, lens: string): boolean {
  if (lens === "procurement") return true;
  if (lens === "audit") {
    const submittedMs = Date.parse(record.submittedAt);
    const escalated =
      record.status === "pending" && Date.now() - submittedMs > SLA_WINDOW_MS;
    return escalated || record.routeTo === "audit";
  }
  if (record.routeTo === lens) return true;
  const allowed = LENS_CATEGORIES[lens] ?? [];
  return allowed.includes(record.category);
}

function listRequests(req: MockRequest): MockResponse {
  const orgId = req.orgId ?? "org_acme";
  const status = req.query.get("status") ?? "all";
  const lens = req.query.get("lens");
  let records = [...store.requests.values()].filter((r) => r.orgId === orgId);
  if (status !== "all") {
    if (!(VALID_STATUSES as ReadonlyArray<string>).includes(status)) {
      return badRequest(`status must be one of: all, ${VALID_STATUSES.join(", ")}`);
    }
    records = records.filter((r) => r.status === (status as RequestStatus));
  }
  if (lens && LENS_CATEGORIES[lens] !== undefined) {
    const filtered = records.filter((r) => matchesLens(r, lens));
    if (filtered.length > 0 || records.length === 0) records = filtered;
  }
  const sorted = records
    .slice()
    .sort((a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt))
    .map(toDto);
  return ok({ requests: sorted });
}

function getRequest(req: MockRequest, id: string): MockResponse {
  const orgId = req.orgId ?? "org_acme";
  const record = store.requests.get(id);
  if (!record || record.orgId !== orgId) {
    return notFound(`No request found with id ${id}`);
  }
  return ok({ request: toDto(record) });
}

function createRequest(req: MockRequest): MockResponse {
  const orgId = req.orgId ?? "org_acme";
  const body = (req.body ?? {}) as Partial<IntakeRequestRecord>;
  if (!body.vendorName || !body.category || body.expectedSpendUsd === undefined) {
    return badRequest("vendorName, category, expectedSpendUsd are required");
  }
  const record: IntakeRequestRecord = {
    id: newId("req"),
    orgId,
    requesterId: req.userId ?? "usr_priya",
    vendorName: body.vendorName,
    category: body.category,
    expectedSpendUsd: body.expectedSpendUsd,
    justification: body.justification ?? "",
    similarTools: body.similarTools ?? [],
    status: "pending",
    submittedAt: nowIso(),
    comments: [],
  };
  store.requests.set(record.id, record);
  return created({ request: toDto(record) });
}

function decideRequest(req: MockRequest, id: string): MockResponse {
  const current = store.requests.get(id);
  if (!current) return notFound(`No request found with id ${id}`);
  const body = (req.body ?? {}) as {
    status?: RequestStatus;
    note?: string;
    routeTo?: RouteTarget;
  };
  if (!body.status) return badRequest("status is required");
  if (body.status === "routed" && !body.routeTo) {
    return badRequest("routeTo is required when status is routed");
  }
  const at = nowIso();
  const actor = req.userId ?? "usr_priya";
  const updated: IntakeRequestRecord = {
    ...current,
    status: body.status,
    approverId: actor,
    decidedAt: at,
  };
  if (body.routeTo !== undefined) {
    updated.routeTo = body.routeTo;
  } else if (body.status !== "routed") {
    delete updated.routeTo;
  }
  if (body.note) {
    updated.comments = [
      ...current.comments,
      {
        id: `cmt_${id}_${current.comments.length + 1}`,
        by: actor,
        at,
        text: body.note,
      },
    ];
  }
  store.requests.set(id, updated);
  return ok({ request: toDto(updated) });
}

function commentRequest(req: MockRequest, id: string): MockResponse {
  const current = store.requests.get(id);
  if (!current) return notFound(`No request found with id ${id}`);
  const body = (req.body ?? {}) as { text?: string };
  if (!body.text || body.text.trim().length === 0) {
    return badRequest("text is required");
  }
  const updated: IntakeRequestRecord = {
    ...current,
    comments: [
      ...current.comments,
      {
        id: `cmt_${id}_${current.comments.length + 1}`,
        by: req.userId ?? "usr_priya",
        at: nowIso(),
        text: body.text,
      },
    ],
  };
  store.requests.set(id, updated);
  return ok({ request: toDto(updated) });
}

export function registerRequestHandlers(): void {
  register("GET", /^\/v1\/requests$/, listRequests);
  register("POST", /^\/v1\/requests$/, createRequest);
  register("GET", /^\/v1\/requests\/([^/]+)$/, (req, p) =>
    getRequest(req, p[0] ?? ""),
  );
  register("POST", /^\/v1\/requests\/([^/]+)\/decision$/, (req, p) =>
    decideRequest(req, p[0] ?? ""),
  );
  register("POST", /^\/v1\/requests\/([^/]+)\/comments$/, (req, p) =>
    commentRequest(req, p[0] ?? ""),
  );
}
