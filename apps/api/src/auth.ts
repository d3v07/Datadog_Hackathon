import type { MiddlewareHandler } from "hono";
import { ApiError } from "./lib/errors.js";
import { ErrorCodes } from "@redline/shared";
import { resolveBearer } from "./seed/loader.js";

declare module "hono" {
  interface ContextVariableMap {
    orgId: string;
    requestId: string;
  }
}

const PUBLIC_PATHS: readonly string[] = [
  "/health",
  "/webhooks/stripe",
  // /v1/stream uses its own ?token= query param flow because EventSource has
  // no header support; handled inside the route, bypassed here.
  "/v1/stream",
  "/evidence/",
];

function isPublic(path: string): boolean {
  return PUBLIC_PATHS.some((p) =>
    p.endsWith("/") ? path.startsWith(p) : path === p,
  );
}

export const bearerAuth: MiddlewareHandler = async (c, next) => {
  if (isPublic(c.req.path)) return next();

  const header = c.req.header("authorization");
  if (!header || !header.toLowerCase().startsWith("bearer ")) {
    throw new ApiError(
      ErrorCodes.Unauthenticated,
      "Missing or invalid bearer token",
    );
  }
  const token = header.slice("bearer ".length).trim().replace(/^"|"$/g, "");
  const orgId = resolveBearer(token);
  if (!orgId) {
    throw new ApiError(
      ErrorCodes.Unauthenticated,
      "Missing or invalid bearer token",
    );
  }
  c.set("orgId", orgId);
  return next();
};
