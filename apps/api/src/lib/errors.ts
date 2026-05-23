import type { ApiErrorEnvelope } from "@redline/shared";
import { ErrorCodes, type ErrorCode } from "@redline/shared";

// Maps stable error codes to HTTP status (handoff/API §01).
const StatusByCode: Record<string, number> = {
  [ErrorCodes.ValidationFailed]: 400,
  [ErrorCodes.Unauthenticated]: 401,
  [ErrorCodes.Forbidden]: 403,
  [ErrorCodes.NotFound]: 404,
  [ErrorCodes.Conflict]: 409,
  [ErrorCodes.Duplicate]: 409,
  [ErrorCodes.DiscoveryIncomplete]: 422,
  [ErrorCodes.Unprocessable]: 422,
  [ErrorCodes.Internal]: 500,
  [ErrorCodes.UpstreamFailed]: 502,
};

export class ApiError extends Error {
  public override readonly name = "ApiError";
  public readonly code: ErrorCode;
  public readonly status: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.code = code;
    this.status = StatusByCode[code] ?? 500;
    if (details) this.details = details;
  }

  toEnvelope(requestId?: string): ApiErrorEnvelope {
    const envelope: ApiErrorEnvelope = {
      error: {
        code: this.code,
        message: this.message,
      },
    };
    if (this.details) envelope.error.details = this.details;
    if (requestId) envelope.error.requestId = requestId;
    return envelope;
  }
}
