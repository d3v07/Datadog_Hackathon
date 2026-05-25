// Mirrors RequestDto in apps/api/src/routes/requests.ts. The widened `status`
// type (includes "routed") differs from shared/IntakeRequest, which is why we
// keep this local instead of importing from @unsyphn/shared.

export type RequestStatus = "pending" | "approved" | "rejected" | "routed";

export type RouteTarget =
  | "legal"
  | "security"
  | "finance"
  | "procurement"
  | "it"
  | "audit";

export const ROUTE_TARGETS: ReadonlyArray<RouteTarget> = [
  "legal",
  "security",
  "finance",
  "procurement",
  "it",
  "audit",
];

export interface RequestComment {
  id: string;
  by: string;
  at: string;
  text: string;
  authorName: string;
  authorLetter: string;
}

export interface RequestDto {
  id: string;
  vendorName: string;
  requesterEmail: string;
  expectedSpendUsd: number;
  justification: string;
  status: RequestStatus;
  similarTools: string[];
  createdAt: string;
  category: string;
  comments: RequestComment[];
  requesterId: string;
  requesterName: string;
  approverId?: string;
  approverName?: string;
  decidedAt?: string;
  routeTo?: RouteTarget;
  autoEscalated: boolean;
  slaDueAt: string;
}

export interface RequestsListResponse {
  requests: RequestDto[];
}

export interface RequestSingleResponse {
  request: RequestDto;
}

export type StatusFilter = "pending" | "routed" | "approved" | "rejected" | "all";
