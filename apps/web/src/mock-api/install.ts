// Install hook — patches window.fetch and EventSource so /v1/* calls resolve
// against the mock router instead of the network. Called from main.tsx when
// no real API base is configured.

import { registerAllHandlers } from "./handlers/index.js";
import { dispatch, requiresAuth } from "./router.js";
import type { MockRequest, MockResponse } from "./types.js";
import { unauthorized } from "./types.js";
import { DEFAULT_ORG_ID, store } from "./store.js";

let installed = false;

function safeParseJson(body: BodyInit | null | undefined): unknown {
  if (body == null) return undefined;
  if (typeof body !== "string") return undefined;
  try {
    return JSON.parse(body);
  } catch {
    return undefined;
  }
}

function resolveAuth(headers: Headers): { orgId: string | null; userId: string | null } {
  const auth = headers.get("authorization") ?? headers.get("Authorization");
  if (!auth) return { orgId: null, userId: null };
  const match = /^Bearer\s+(.+)$/i.exec(auth);
  if (!match) return { orgId: null, userId: null };
  const token = match[1]?.trim() ?? "";
  if (!token) return { orgId: null, userId: null };
  // Accept any non-empty bearer — Settings/renewals/etc. write a custom token to
  // localStorage. Map known tokens to the seeded org; everything else lands on
  // the default org so single-tenant flows still work.
  const orgId = store.tokens.get(token) ?? DEFAULT_ORG_ID;
  // Demo always acts as usr_priya unless a future header overrides it.
  return { orgId, userId: "usr_priya" };
}

function buildRequest(input: RequestInfo | URL, init?: RequestInit): MockRequest {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
  const parsed = new URL(url, window.location.origin);
  const method = (init?.method ?? "GET").toUpperCase();
  const headers = new Headers(init?.headers);
  const body = safeParseJson(init?.body as BodyInit | null | undefined);
  const { orgId, userId } = resolveAuth(headers);
  return {
    pathname: parsed.pathname,
    method,
    query: parsed.searchParams,
    body,
    headers,
    orgId,
    userId,
  };
}

function toResponse(result: MockResponse): Response {
  const headers = new Headers(result.headers);
  if (result.binary !== undefined) {
    if (result.contentType && !headers.has("Content-Type")) {
      headers.set("Content-Type", result.contentType);
    }
    return new Response(result.binary, {
      status: result.status,
      headers,
    });
  }
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers,
  });
}

function patchFetch(): void {
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    let parsedPath: string;
    try {
      parsedPath = new URL(url, window.location.origin).pathname;
    } catch {
      return originalFetch(input, init);
    }
    if (!parsedPath.startsWith("/v1/")) {
      return originalFetch(input, init);
    }
    const req = buildRequest(input, init);
    if (requiresAuth(req.pathname) && req.orgId === null) {
      return toResponse(unauthorized());
    }
    const result = await dispatch(req);
    return toResponse(result);
  };
}

function patchEventSource(): void {
  if (typeof EventSource === "undefined") return;
  const OriginalEventSource = window.EventSource;
  class StubEventSource implements EventSource {
    public readonly url: string;
    public readonly withCredentials = false;
    public readonly readyState = 1;
    public onopen: ((this: EventSource, ev: Event) => unknown) | null = null;
    public onmessage: ((this: EventSource, ev: MessageEvent) => unknown) | null = null;
    public onerror: ((this: EventSource, ev: Event) => unknown) | null = null;
    public static readonly CONNECTING = 0 as const;
    public static readonly OPEN = 1 as const;
    public static readonly CLOSED = 2 as const;
    public readonly CONNECTING = 0 as const;
    public readonly OPEN = 1 as const;
    public readonly CLOSED = 2 as const;
    constructor(url: string | URL) {
      this.url = typeof url === "string" ? url : url.toString();
    }
    addEventListener(): void {}
    removeEventListener(): void {}
    dispatchEvent(): boolean {
      return false;
    }
    close(): void {}
  }
  window.EventSource = new Proxy(OriginalEventSource, {
    construct(target, args) {
      const url = String(args[0] ?? "");
      if (url.includes("/v1/stream")) {
        return new StubEventSource(url) as unknown as EventSource;
      }
      return Reflect.construct(target, args);
    },
  });
}

export function install(): void {
  if (installed) return;
  installed = true;
  registerAllHandlers();
  patchFetch();
  patchEventSource();
}
