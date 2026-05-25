import { Hono } from "hono";
import { z } from "zod";
import { ErrorCodes, type IntakeRequest } from "@unsyphn/shared";
import {
  requestsStore,
  type IntakeRequestRecord,
  type RequestStatus,
} from "../db/requests-store.js";
import { ApiError } from "../lib/errors.js";
import { getUser } from "../seed/loader.js";

const VALID_STATUSES: ReadonlyArray<RequestStatus> = ["pending", "approved", "rejected", "routed"];

const ROUTE_TARGETS = ["legal", "security", "finance", "procurement", "it", "audit"] as const;
type RouteTarget = (typeof ROUTE_TARGETS)[number];

// SLA: requests pending past this window are flagged auto-escalated.
const SLA_WINDOW_MS = 48 * 60 * 60 * 1000;

// Lens → category allowlist. Requests without a tagged category fall back to
// procurement (every lens that includes procurement still sees them).
const LENS_CATEGORIES: Record<string, ReadonlyArray<string>> = {
  procurement: [],
  legal: ["contracts", "dpa", "compliance", "data"],
  security: ["security", "data", "infrastructure"],
  finance: ["payments", "analytics", "spend"],
  it: ["infrastructure", "productivity", "devtools"],
  audit: [],
};

const createRequestSchema = z
  .object({
    vendorName: z.string().trim().min(2).max(80),
    category: z.string().trim().min(2).max(40),
    expectedSpendUsd: z.number().nonnegative(),
    justification: z.string().trim().min(10).max(1000),
    similarTools: z.array(z.string().trim().min(1)).max(20).optional(),
  })
  .strict();

const decideSchema = z
  .object({
    status: z.enum(["approved", "rejected", "routed", "pending"]),
    note: z.string().trim().min(1).max(500).optional(),
    routeTo: z.enum(ROUTE_TARGETS).optional(),
  })
  .strict();

const commentSchema = z
  .object({
    text: z.string().trim().min(1).max(500),
  })
  .strict();

// Phase 6 DTO: legacy fields kept for backwards compat, new fields denormalize
// requester/approver names + comment authors so the frontend doesn't need a
// separate /v1/users call. `status` here carries the real RequestStatus
// (including "routed") — wider than the legacy IntakeRequest contract.
export interface RequestCommentDto {
  id: string;
  by: string;
  at: string;
  text: string;
  authorName: string;
  authorLetter: string;
}

export interface RequestDto extends Omit<IntakeRequest, "status"> {
  status: RequestStatus;
  category: string;
  comments: RequestCommentDto[];
  requesterId: string;
  requesterName: string;
  approverId?: string;
  approverName?: string;
  decidedAt?: string;
  routeTo?: RouteTarget;
  autoEscalated: boolean;
  slaDueAt: string;
}

function avatarLetter(name: string | undefined, fallback: string): string {
  const source = name && name.length > 0 ? name : fallback;
  return source.charAt(0).toUpperCase();
}

function toDto(record: IntakeRequestRecord): RequestDto {
  const requester = getUser(record.requesterId);
  const approver = record.approverId ? getUser(record.approverId) : undefined;
  const requesterName = requester?.name ?? record.requesterId;
  const submittedMs = Date.parse(record.submittedAt);
  const slaDueAt = new Date(submittedMs + SLA_WINDOW_MS).toISOString();
  const autoEscalated =
    record.status === "pending" && Date.now() - submittedMs > SLA_WINDOW_MS;

  const comments: RequestCommentDto[] = record.comments.map((c) => {
    const author = getUser(c.by);
    const authorName = author?.name ?? c.by;
    return {
      id: c.id,
      by: c.by,
      at: c.at,
      text: c.text,
      authorName,
      authorLetter: avatarLetter(author?.name, c.by),
    };
  });

  const dto: RequestDto = {
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

function nowIso(): string {
  return new Date().toISOString();
}

function nextId(): string {
  return `req_${Math.random().toString(36).slice(2, 10)}`;
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

export const requestsRoute = new Hono();

requestsRoute.get("/", (c) => {
  const auth = c.get("auth");
  const status = c.req.query("status") ?? "all";
  const lens = c.req.query("lens");

  let records = requestsStore.list(auth.orgId);
  if (status !== "all") {
    if (!(VALID_STATUSES as ReadonlyArray<string>).includes(status)) {
      throw new ApiError(
        ErrorCodes.Unprocessable,
        `status must be one of: all, ${VALID_STATUSES.join(", ")}`,
      );
    }
    records = records.filter((r) => r.status === (status as RequestStatus));
  }

  if (lens && LENS_CATEGORIES[lens] !== undefined) {
    const filtered = records.filter((r) => matchesLens(r, lens));
    // Don't strand the user with an empty list when the lens excludes everything.
    if (filtered.length > 0 || records.length === 0) {
      records = filtered;
    }
  }

  const requests = records
    .slice()
    .sort((a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt))
    .map(toDto);

  return c.json({ requests });
});

requestsRoute.post("/", async (c) => {
  const auth = c.get("auth");
  const parsed = createRequestSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    throw new ApiError(ErrorCodes.Unprocessable, "Request body is invalid", {
      issues: parsed.error.flatten(),
    });
  }

  const record = requestsStore.create({
    id: nextId(),
    orgId: auth.orgId,
    requesterId: auth.userId,
    vendorName: parsed.data.vendorName,
    category: parsed.data.category,
    expectedSpendUsd: parsed.data.expectedSpendUsd,
    justification: parsed.data.justification,
    similarTools: parsed.data.similarTools ?? [],
    submittedAt: nowIso(),
  });

  return c.json({ request: toDto(record) }, 201);
});

requestsRoute.post("/:id/decision", async (c) => {
  const auth = c.get("auth");
  const id = c.req.param("id");
  const parsed = decideSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    throw new ApiError(ErrorCodes.Unprocessable, "Request body is invalid", {
      issues: parsed.error.flatten(),
    });
  }

  if (parsed.data.status === "routed" && !parsed.data.routeTo) {
    throw new ApiError(ErrorCodes.Unprocessable, "routeTo is required when status is routed");
  }

  const decision: Parameters<typeof requestsStore.decide>[1] = {
    status: parsed.data.status,
    approverId: auth.userId,
    decidedAt: nowIso(),
  };
  if (parsed.data.note !== undefined) decision.note = parsed.data.note;
  if (parsed.data.routeTo !== undefined) decision.routeTo = parsed.data.routeTo;

  const updated = requestsStore.decide(id, decision);
  if (!updated) {
    throw new ApiError(ErrorCodes.NotFound, `No request found with id ${id}`);
  }

  return c.json({ request: toDto(updated) });
});

requestsRoute.post("/:id/comments", async (c) => {
  const auth = c.get("auth");
  const id = c.req.param("id");
  const parsed = commentSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    throw new ApiError(ErrorCodes.Unprocessable, "Request body is invalid", {
      issues: parsed.error.flatten(),
    });
  }

  const updated = requestsStore.addComment(id, {
    by: auth.userId,
    at: nowIso(),
    text: parsed.data.text,
  });
  if (!updated) {
    throw new ApiError(ErrorCodes.NotFound, `No request found with id ${id}`);
  }

  return c.json({ request: toDto(updated) });
});
