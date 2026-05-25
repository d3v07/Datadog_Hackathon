import type { MiddlewareHandler } from "hono";
import type { OrgId, UserId } from "@unsyphn/shared";
import { errorResponse } from "./errors.js";
import { resolveBearer } from "./seed/loader.js";

export interface AuthContext {
  orgId: OrgId;
  userId: UserId;
  token: string;
}

export interface SeedToken {
  token: string;
  orgId: OrgId;
  userId: UserId;
}

declare module "hono" {
  interface ContextVariableMap {
    auth: AuthContext;
    orgId: OrgId;
    requestId: string;
  }
}

const DEFAULT_USER_ID = "usr_priya" as UserId;

const DEMO_TOKEN: SeedToken = {
  token: "demo_token_acme_corp_2026",
  orgId: "org_acme" as OrgId,
  userId: DEFAULT_USER_ID,
};

export function createAuthMiddleware(tokens: SeedToken[] = [DEMO_TOKEN]): MiddlewareHandler {
  const tokenMap = new Map(tokens.map((entry) => [entry.token, entry]));

  return async (c, next) => {
    const bearerToken = c.req.header("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
    const queryToken = c.req.query("token");
    const token = bearerToken ?? queryToken;
    let resolved = token ? tokenMap.get(token) : undefined;

    if (!resolved && token) {
      const orgId = resolveBearer(token);
      if (orgId) {
        resolved = { token, orgId: orgId as OrgId, userId: DEFAULT_USER_ID };
      }
    }

    if (!resolved) {
      return errorResponse(c, 401, "unauthenticated", "Missing or invalid bearer token");
    }

    c.set("auth", {
      orgId: resolved.orgId,
      userId: resolved.userId,
      token: resolved.token,
    });
    c.set("orgId", resolved.orgId);

    await next();
  };
}

export const authMiddleware = createAuthMiddleware();
export const bearerAuth = authMiddleware;
