// Integrations catalog lives in-memory per handoff/Data Model. Seeded from
// seed/integrations.json. The Settings screen reads this list to render the
// connector catalog and posts to mutate connection state.

export type IntegrationCategory = "inbound" | "outbound";
export type IntegrationAuthType = "oauth" | "api-key" | "saml";

export interface IntegrationField {
  key: string;
  label: string;
  placeholder?: string;
  sensitive?: boolean;
  optional?: boolean;
}

export interface IntegrationRecord {
  id: string;
  name: string;
  slug: string;
  category: IntegrationCategory;
  description: string;
  authType: IntegrationAuthType;
  iconSlug?: string;
  iconColor?: string;
  requiredFields: IntegrationField[];
  defaultScopes: string[];
  connected: boolean;
  scopes?: string[];
  connectedAs?: string;
  connectedAt?: string;
  lastSyncedAt?: string;
}

export interface SyncRecord {
  id: string;
  startedAt: string;
  durationMs: number;
  recordsScanned: number;
  status: "success" | "partial";
}

interface ConnectInput {
  values?: Record<string, string>;
  scopes?: string[];
  connectedAs?: string;
}

export class IntegrationsStore {
  private byId = new Map<string, IntegrationRecord>();
  // Sensitive values are kept out of the public IntegrationRecord and live in
  // a side map. Demo only — production would push these into a secret store.
  private valuesById = new Map<string, Record<string, string>>();
  private historyById = new Map<string, SyncRecord[]>();

  load(records: IntegrationRecord[]): void {
    this.byId.clear();
    this.valuesById.clear();
    this.historyById.clear();
    for (const r of records) this.byId.set(r.id, r);
  }

  get(id: string): IntegrationRecord | undefined {
    return this.byId.get(id);
  }

  list(filter?: { category?: IntegrationCategory }): IntegrationRecord[] {
    const all = [...this.byId.values()];
    return filter?.category ? all.filter((r) => r.category === filter.category) : all;
  }

  connect(id: string, input: ConnectInput): IntegrationRecord | undefined {
    const current = this.byId.get(id);
    if (!current) return undefined;
    const now = new Date().toISOString();
    const updated: IntegrationRecord = {
      ...current,
      connected: true,
      scopes: input.scopes ?? current.defaultScopes,
      ...(input.connectedAs ? { connectedAs: input.connectedAs } : {}),
      connectedAt: now,
      lastSyncedAt: now,
    };
    this.byId.set(id, updated);
    if (input.values && Object.keys(input.values).length > 0) {
      this.valuesById.set(id, { ...input.values });
    }
    return updated;
  }

  disconnect(id: string): IntegrationRecord | undefined {
    const current = this.byId.get(id);
    if (!current) return undefined;
    const updated: IntegrationRecord = {
      ...current,
      connected: false,
      scopes: undefined,
      connectedAs: undefined,
      connectedAt: undefined,
      lastSyncedAt: undefined,
    };
    this.byId.set(id, updated);
    this.valuesById.delete(id);
    this.historyById.delete(id);
    return updated;
  }

  recordSync(id: string, recordsScanned: number): SyncRecord | undefined {
    const current = this.byId.get(id);
    if (!current) return undefined;
    const now = new Date().toISOString();
    const sync: SyncRecord = {
      id: `sync_${Date.now()}`,
      startedAt: now,
      durationMs: 1500 + Math.floor(Math.random() * 4000),
      recordsScanned,
      status: "success",
    };
    const history = this.historyById.get(id) ?? this.seedHistory(id);
    this.historyById.set(id, [sync, ...history].slice(0, 20));
    this.byId.set(id, { ...current, lastSyncedAt: now });
    return sync;
  }

  syncHistory(id: string, limit = 5): SyncRecord[] {
    const current = this.byId.get(id);
    if (!current?.connected) return [];
    const cached = this.historyById.get(id);
    if (cached) return cached.slice(0, limit);
    const seeded = this.seedHistory(id);
    this.historyById.set(id, seeded);
    return seeded.slice(0, limit);
  }

  // Deterministic synthetic history: 5 syncs across the last ~7 days, descending.
  private seedHistory(id: string): SyncRecord[] {
    const hash = Array.from(id).reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 7);
    const now = Date.now();
    return Array.from({ length: 5 }, (_, i) => {
      const offsetMs = ((hash + i * 13) % 168) * 60 * 60 * 1000 + i * 6 * 60 * 60 * 1000;
      return {
        id: `sync_${id}_${i}`,
        startedAt: new Date(now - offsetMs).toISOString(),
        durationMs: 2000 + ((hash + i * 7) % 6000),
        recordsScanned: 80 + ((hash + i * 53) % 7900),
        status: i === 4 ? "partial" : "success",
      };
    });
  }
}

export const integrationsStore = new IntegrationsStore();
