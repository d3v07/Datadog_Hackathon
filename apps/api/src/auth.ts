import type { MiddlewareHandler } from "hono";
import type { OrgId, UserId } from "@redline/shared";
import { errorResponse } from "./errors.js";

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
  }
}

const DEMO_TOKEN: SeedToken = {
  token: "demo_token_acme_corp_2026",
  orgId: "org_acme" as OrgId,
  userId: "usr_priya" as UserId,
};

export function createAuthMiddleware(tokens: SeedToken[] = [DEMO_TOKEN]): MiddlewareHandler {
  const tokenMap = new Map(tokens.map((entry) => [entry.token, entry]));

  return async (c, next) => {
    const bearerToken = c.req.header("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
    const queryToken = c.req.query("token");
    const token = bearerToken ?? queryToken;
    const resolved = token ? tokenMap.get(token) : undefined;

    if (!resolved) {
      return errorResponse(c, 401, "unauthenticated", "Missing or invalid bearer token");
    }

    c.set("auth", {
      orgId: resolved.orgId,
      userId: resolved.userId,
      token: resolved.token,
    });

    await next();
  };
}
