import { DEMO_BEARER_TOKEN } from "../../lib/api.js";
import type {
  RequestDto,
  RequestSingleResponse,
  RequestsListResponse,
  RequestStatus,
  RouteTarget,
  StatusFilter,
} from "./types.js";

interface ApiErrorShape {
  error: { code: string; message: string };
}

class RequestsApiError extends Error {
  public readonly code: string;
  public readonly status: number;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "RequestsApiError";
    this.code = code;
    this.status = status;
  }
}

async function send<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${DEMO_BEARER_TOKEN}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const resp = await fetch(path, { ...init, headers });
  const text = await resp.text();
  const json = text ? (JSON.parse(text) as unknown) : undefined;
  if (!resp.ok) {
    const envelope = json as ApiErrorShape | undefined;
    const code = envelope?.error?.code ?? "internal";
    const message = envelope?.error?.message ?? `Request failed with ${resp.status}`;
    throw new RequestsApiError(resp.status, code, message);
  }
  return json as T;
}

export interface ListRequestsParams {
  status: StatusFilter;
  lens?: string;
}

export async function listRequests(params: ListRequestsParams): Promise<RequestDto[]> {
  const search = new URLSearchParams();
  if (params.status !== "all") search.set("status", params.status);
  if (params.lens) search.set("lens", params.lens);
  const qs = search.toString();
  const data = await send<RequestsListResponse>(`/v1/requests${qs ? `?${qs}` : ""}`);
  return data.requests;
}

export interface CreateRequestBody {
  vendorName: string;
  category: string;
  expectedSpendUsd: number;
  justification: string;
  similarTools: string[];
}

export async function createRequest(body: CreateRequestBody): Promise<RequestDto> {
  const data = await send<RequestSingleResponse>("/v1/requests", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return data.request;
}

export interface DecisionBody {
  status: RequestStatus;
  note?: string;
  routeTo?: RouteTarget;
}

export async function decideRequest(id: string, body: DecisionBody): Promise<RequestDto> {
  const data = await send<RequestSingleResponse>(
    `/v1/requests/${encodeURIComponent(id)}/decision`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
  return data.request;
}

export async function getRequest(id: string): Promise<RequestDto> {
  const data = await send<RequestSingleResponse>(
    `/v1/requests/${encodeURIComponent(id)}`,
  );
  return data.request;
}

export async function addRequestComment(id: string, text: string): Promise<RequestDto> {
  const data = await send<RequestSingleResponse>(
    `/v1/requests/${encodeURIComponent(id)}/comments`,
    {
      method: "POST",
      body: JSON.stringify({ text }),
    },
  );
  return data.request;
}

export { RequestsApiError };
