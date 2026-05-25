import type { UserId, VendorId } from "@unsyphn/shared";

// Renewals live in-memory per handoff/Data Model. Seeded at boot from
// seed/renewals.json; column moves and closure flags persist for the life
// of the process so the Renewals board can demonstrate drag-and-drop state.

export type RenewalColumn = "triage" | "negotiate" | "sign";

export interface RenewalRecord {
  id: string;
  vendorId: VendorId;
  vendorName: string;
  renewsAt: string;
  annualSpendUsd: number;
  currentColumn: RenewalColumn;
  ownerId: UserId;
  priceDeltaPct: number;
  seatUtilizationPct: number;
  blockerCount: number;
  recommendedAction: string;
  declined?: boolean;
  autoRenewed?: boolean;
}

export type RenewalPatch = Partial<
  Pick<RenewalRecord, "currentColumn" | "ownerId" | "declined" | "autoRenewed">
>;

export class RenewalsStore {
  private byId = new Map<string, RenewalRecord>();

  load(records: RenewalRecord[]): void {
    this.byId.clear();
    for (const r of records) this.byId.set(r.id, r);
  }

  get(id: string): RenewalRecord | undefined {
    return this.byId.get(id);
  }

  list(): RenewalRecord[] {
    return [...this.byId.values()];
  }

  update(id: string, patch: RenewalPatch): RenewalRecord | undefined {
    const current = this.byId.get(id);
    if (!current) return undefined;
    const updated: RenewalRecord = { ...current, ...patch };
    this.byId.set(id, updated);
    return updated;
  }

  setColumn(id: string, column: RenewalColumn): RenewalRecord | undefined {
    return this.update(id, { currentColumn: column });
  }
}

export const renewalsStore = new RenewalsStore();
