import type { OrgId, UserId } from "@unsyphn/shared";

// Intake requests live in-memory per handoff/Data Model. Seeded from
// seed/requests.json; new submissions append at runtime, decisions and
// comments mutate the existing record.

export type RequestStatus = "pending" | "approved" | "rejected" | "routed";

export interface RequestComment {
  id: string;
  by: UserId;
  at: string;
  text: string;
}

export type RouteTarget =
  | "legal"
  | "security"
  | "finance"
  | "procurement"
  | "it"
  | "audit";

export interface IntakeRequestRecord {
  id: string;
  orgId: OrgId;
  requesterId: UserId;
  vendorName: string;
  category: string;
  expectedSpendUsd: number;
  justification: string;
  similarTools: string[];
  status: RequestStatus;
  submittedAt: string;
  approverId?: UserId;
  decidedAt?: string;
  routeTo?: RouteTarget;
  comments: RequestComment[];
}

interface CreateInput {
  id: string;
  orgId: OrgId;
  requesterId: UserId;
  vendorName: string;
  category: string;
  expectedSpendUsd: number;
  justification: string;
  similarTools?: string[];
  submittedAt: string;
}

interface DecideInput {
  // Allow `pending` so Recall (routed → pending) and Re-open (rejected →
  // pending) can flow through the same code path.
  status: RequestStatus;
  approverId: UserId;
  decidedAt: string;
  note?: string;
  routeTo?: RouteTarget;
}

interface CommentInput {
  by: UserId;
  at: string;
  text: string;
}

export class RequestsStore {
  private byId = new Map<string, IntakeRequestRecord>();

  load(records: IntakeRequestRecord[]): void {
    this.byId.clear();
    for (const r of records) this.byId.set(r.id, r);
  }

  get(id: string): IntakeRequestRecord | undefined {
    return this.byId.get(id);
  }

  list(orgId: OrgId, filter?: { status?: RequestStatus }): IntakeRequestRecord[] {
    const all = [...this.byId.values()].filter((r) => r.orgId === orgId);
    return filter?.status ? all.filter((r) => r.status === filter.status) : all;
  }

  create(input: CreateInput): IntakeRequestRecord {
    const record: IntakeRequestRecord = {
      id: input.id,
      orgId: input.orgId,
      requesterId: input.requesterId,
      vendorName: input.vendorName,
      category: input.category,
      expectedSpendUsd: input.expectedSpendUsd,
      justification: input.justification,
      similarTools: input.similarTools ?? [],
      status: "pending",
      submittedAt: input.submittedAt,
      comments: [],
    };
    this.byId.set(record.id, record);
    return record;
  }

  decide(id: string, decision: DecideInput): IntakeRequestRecord | undefined {
    const current = this.byId.get(id);
    if (!current) return undefined;
    const updated: IntakeRequestRecord = {
      ...current,
      status: decision.status,
      approverId: decision.approverId,
      decidedAt: decision.decidedAt,
    };
    if (decision.routeTo !== undefined) {
      updated.routeTo = decision.routeTo;
    } else if (decision.status !== "routed") {
      // Clear stale route target when leaving the routed lane.
      delete updated.routeTo;
    }
    if (decision.note) {
      const comment: RequestComment = {
        id: `cmt_${id}_${updated.comments.length + 1}`,
        by: decision.approverId,
        at: decision.decidedAt,
        text: decision.note,
      };
      updated.comments = [...current.comments, comment];
    }
    this.byId.set(id, updated);
    return updated;
  }

  addComment(id: string, comment: CommentInput): IntakeRequestRecord | undefined {
    const current = this.byId.get(id);
    if (!current) return undefined;
    const next: RequestComment = {
      id: `cmt_${id}_${current.comments.length + 1}`,
      by: comment.by,
      at: comment.at,
      text: comment.text,
    };
    const updated: IntakeRequestRecord = {
      ...current,
      comments: [...current.comments, next],
    };
    this.byId.set(id, updated);
    return updated;
  }
}

export const requestsStore = new RequestsStore();
