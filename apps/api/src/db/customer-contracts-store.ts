// Customer contracts (i.e. Acme's downstream customers) live in-memory per
// handoff/Data Model. Used by the sub-processor heatmap to compute customer
// notification obligations.

export interface CustomerContractRecord {
  id: string;
  customerId: string;
  customerName: string;
  contractId: string;
  domain: string;
  contractStart: string;
  contractEnd: string;
  annualValueUsd: number;
  dataResidency: string;
  dpaClause: string;
  noticeDays: number;
  notifiedSubProcessors: string[];
}

export class CustomerContractsStore {
  private byId = new Map<string, CustomerContractRecord>();

  load(records: CustomerContractRecord[]): void {
    this.byId.clear();
    for (const r of records) this.byId.set(r.id, r);
  }

  get(id: string): CustomerContractRecord | undefined {
    return this.byId.get(id);
  }

  list(): CustomerContractRecord[] {
    return [...this.byId.values()];
  }

  // Customers who must be notified when a flagged sub-processor is added.
  listNotificationCandidates(): CustomerContractRecord[] {
    return this.list().filter((c) => c.notifiedSubProcessors.length > 0);
  }
}

export const customerContractsStore = new CustomerContractsStore();
