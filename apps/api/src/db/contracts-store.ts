import type { VendorId } from "@unsyphn/shared";

// Contracts uploaded by the user against a vendor. In-memory per the demo
// constraints — production would push the file blob to object storage and
// keep only metadata here.

export interface ContractRecord {
  id: string;
  vendorId: VendorId;
  filename: string;
  sizeBytes: number;
  contentBase64: string;
  uploadedBy: string;
  uploadedAt: string;
}

export class ContractsStore {
  private byVendor = new Map<VendorId, ContractRecord[]>();
  private sequence = 0;

  add(record: Omit<ContractRecord, "id">): ContractRecord {
    this.sequence += 1;
    const stored: ContractRecord = {
      ...record,
      id: `ctr_${String(this.sequence).padStart(6, "0")}`,
    };
    const existing = this.byVendor.get(record.vendorId) ?? [];
    this.byVendor.set(record.vendorId, [...existing, stored]);
    return { ...stored };
  }

  listByVendor(vendorId: VendorId): ContractRecord[] {
    return (this.byVendor.get(vendorId) ?? []).map((r) => ({ ...r }));
  }

  getById(vendorId: VendorId, contractId: string): ContractRecord | undefined {
    const found = (this.byVendor.get(vendorId) ?? []).find(
      (r) => r.id === contractId,
    );
    return found ? { ...found } : undefined;
  }

  reset(): void {
    this.byVendor.clear();
    this.sequence = 0;
  }
}

export const contractsStore = new ContractsStore();
