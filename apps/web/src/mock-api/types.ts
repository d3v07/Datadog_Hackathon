// Shared request/response types for the mock-API router and handlers.

export interface MockRequest {
  pathname: string;
  method: string;
  query: URLSearchParams;
  body: unknown;
  headers: Headers;
  orgId: string | null;
  userId: string | null;
}

export interface MockResponse {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
  // When set the body is a Uint8Array / Blob payload returned as-is rather than
  // JSON-serialized. Used for contract downloads, PDF, HTML bundles, etc.
  binary?: BodyInit;
  contentType?: string;
}

export type Handler = (
  req: MockRequest,
  params: string[],
) => Promise<MockResponse> | MockResponse;

export interface RouteDef {
  method: string;
  pattern: RegExp;
  handler: Handler;
}

export function ok(body: unknown): MockResponse {
  return { status: 200, body };
}

export function created(body: unknown): MockResponse {
  return { status: 201, body };
}

export function notFound(message: string): MockResponse {
  return {
    status: 404,
    body: { error: { code: "not-found", message } },
  };
}

export function badRequest(message: string, code = "validation-failed"): MockResponse {
  return {
    status: 422,
    body: { error: { code, message } },
  };
}

export function unauthorized(message = "Missing bearer token"): MockResponse {
  return {
    status: 401,
    body: { error: { code: "unauthenticated", message } },
  };
}

export function conflict(message: string): MockResponse {
  return {
    status: 409,
    body: { error: { code: "conflict", message } },
  };
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
