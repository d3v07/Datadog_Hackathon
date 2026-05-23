// Policies live in-memory per handoff/Data Model §05. Loaded from
// seed/policies.json at boot. The evidence brief uses this to resolve
// policy IDs to display names.

export interface SeededPolicy {
  id: string;
  orgId: string;
  name: string;
  description?: string;
  version: number;
  createdBy: string;
  isActive: boolean;
  severity: "P1" | "P2" | "P3";
  route: string[];
}

export class PolicyStore {
  private byId = new Map<string, SeededPolicy>();

  load(policies: SeededPolicy[]): void {
    this.byId.clear();
    for (const p of policies) this.byId.set(p.id, p);
  }

  get(id: string): SeededPolicy | undefined {
    return this.byId.get(id);
  }

  list(orgId: string): SeededPolicy[] {
    return [...this.byId.values()].filter((p) => p.orgId === orgId);
  }
}

export const policyStore = new PolicyStore();
