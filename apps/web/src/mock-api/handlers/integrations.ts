// Integrations catalog — list, connect, disconnect, sync, sync history.
// Mirrors apps/api/src/routes/integrations.ts and the integrations-store
// recordSync / seedHistory behaviour.

import { register } from "../router.js";
import {
  store,
  type IntegrationCategory,
  type IntegrationRecord,
  type SyncRecord,
} from "../store.js";
import {
  badRequest,
  notFound,
  ok,
  type MockRequest,
  type MockResponse,
} from "../types.js";

const VALID_CATEGORIES: ReadonlyArray<IntegrationCategory> = ["inbound", "outbound"];

function seedHistory(id: string): SyncRecord[] {
  const hash = Array.from(id).reduce(
    (acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0,
    7,
  );
  const now = Date.now();
  return Array.from({ length: 5 }, (_, i) => {
    const offsetMs =
      ((hash + i * 13) % 168) * 60 * 60 * 1000 + i * 6 * 60 * 60 * 1000;
    return {
      id: `sync_${id}_${i}`,
      startedAt: new Date(now - offsetMs).toISOString(),
      durationMs: 2000 + ((hash + i * 7) % 6000),
      recordsScanned: 80 + ((hash + i * 53) % 7900),
      status: i === 4 ? "partial" : "success",
    };
  });
}

function listIntegrations(req: MockRequest): MockResponse {
  const category = req.query.get("category");
  if (category && !(VALID_CATEGORIES as ReadonlyArray<string>).includes(category)) {
    return badRequest(`category must be one of: ${VALID_CATEGORIES.join(", ")}`);
  }
  const all = [...store.integrations.values()];
  const filtered = category
    ? all.filter((r) => r.category === (category as IntegrationCategory))
    : all;
  return ok({ integrations: filtered });
}

function connect(req: MockRequest, id: string): MockResponse {
  const current = store.integrations.get(id);
  if (!current) return notFound(`No integration found with id ${id}`);
  const body = (req.body ?? {}) as {
    values?: Record<string, string>;
    fields?: Record<string, string>;
    scopes?: string[];
    connectedAs?: string;
  };
  const now = new Date().toISOString();
  const updated: IntegrationRecord = {
    ...current,
    connected: true,
    scopes: body.scopes ?? current.defaultScopes,
    ...(body.connectedAs ? { connectedAs: body.connectedAs } : {}),
    connectedAt: now,
    lastSyncedAt: now,
  };
  store.integrations.set(id, updated);
  return ok({ integration: updated });
}

function disconnect(_req: MockRequest, id: string): MockResponse {
  const current = store.integrations.get(id);
  if (!current) return notFound(`No integration found with id ${id}`);
  const updated: IntegrationRecord = {
    ...current,
    connected: false,
    scopes: undefined,
    connectedAs: undefined,
    connectedAt: undefined,
    lastSyncedAt: undefined,
  };
  store.integrations.set(id, updated);
  store.integrationSyncHistory.delete(id);
  return ok({ integration: updated });
}

function sync(_req: MockRequest, id: string): MockResponse {
  const current = store.integrations.get(id);
  if (!current) return notFound(`No integration found with id ${id}`);
  if (!current.connected) {
    return badRequest("Integration must be connected before it can sync");
  }
  const recordsScanned = 100 + Math.floor(Math.random() * 7900);
  const now = new Date().toISOString();
  const record: SyncRecord = {
    id: `sync_${Date.now()}`,
    startedAt: now,
    durationMs: 1500 + Math.floor(Math.random() * 4000),
    recordsScanned,
    status: "success",
  };
  const history = store.integrationSyncHistory.get(id) ?? seedHistory(id);
  store.integrationSyncHistory.set(id, [record, ...history].slice(0, 20));
  store.integrations.set(id, { ...current, lastSyncedAt: now });
  return ok({ synced: true, recordsScanned, sync: record });
}

function syncs(_req: MockRequest, id: string): MockResponse {
  const current = store.integrations.get(id);
  if (!current) return notFound(`No integration found with id ${id}`);
  if (!current.connected) return ok({ syncs: [] });
  const cached = store.integrationSyncHistory.get(id);
  const history = cached ?? seedHistory(id);
  if (!cached) store.integrationSyncHistory.set(id, history);
  return ok({ syncs: history.slice(0, 5) });
}

export function registerIntegrationHandlers(): void {
  register("GET", /^\/v1\/integrations$/, listIntegrations);
  register("POST", /^\/v1\/integrations\/([^/]+)\/connect$/, (req, p) =>
    connect(req, p[0] ?? ""),
  );
  register("POST", /^\/v1\/integrations\/([^/]+)\/disconnect$/, (req, p) =>
    disconnect(req, p[0] ?? ""),
  );
  register("POST", /^\/v1\/integrations\/([^/]+)\/sync$/, (req, p) =>
    sync(req, p[0] ?? ""),
  );
  register("GET", /^\/v1\/integrations\/([^/]+)\/syncs$/, (req, p) =>
    syncs(req, p[0] ?? ""),
  );
}
