import type { Context } from "hono";
import { randomUUID } from "node:crypto";

export type ErrorCode = "unauthenticated" | "not-found" | "internal";

export interface ErrorEnvelope {
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
    requestId: string;
  };
}

export function getRequestId(c: Context): string {
  return c.req.header("x-request-id")?.trim() || `req_${randomUUID()}`;
}

export function errorResponse(c: Context, status: 401 | 404 | 500, code: ErrorCode, message: string, details?: unknown) {
  const body: ErrorEnvelope = {
    error: {
      code,
      message,
      requestId: getRequestId(c),
      ...(details === undefined ? {} : { details }),
    },
  };

  return c.json(body, status);
}
