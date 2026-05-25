// Mock-API router — ordered pattern table dispatched by install.ts. Each
// handler returns a MockResponse which install.ts converts to a real Response.

import type { Handler, MockRequest, MockResponse, RouteDef } from "./types.js";
import { notFound } from "./types.js";

const ROUTES: RouteDef[] = [];

export function register(method: string, pattern: RegExp, handler: Handler): void {
  ROUTES.push({ method: method.toUpperCase(), pattern, handler });
}

// Endpoints that don't require an Authorization header. /v1/evidence is public
// per the real backend; everything else requires a bearer (any non-empty value).
const PUBLIC_PATH_PATTERNS: RegExp[] = [
  /^\/v1\/evidence\/[^/]+$/,
  /^\/v1\/evidence\/[^/]+\/bundle\.html$/,
  /^\/v1\/auditor\/sessions\/[^/]+$/, // signed-token-based, no bearer
  /^\/v1\/health$/,
];

export function requiresAuth(pathname: string): boolean {
  return !PUBLIC_PATH_PATTERNS.some((p) => p.test(pathname));
}

export async function dispatch(req: MockRequest): Promise<MockResponse> {
  for (const route of ROUTES) {
    if (route.method !== req.method) continue;
    const match = route.pattern.exec(req.pathname);
    if (!match) continue;
    const params = match.slice(1).map((p) => decodeURIComponent(p ?? ""));
    return route.handler(req, params);
  }
  return notFound(`No mock handler for ${req.method} ${req.pathname}`);
}
