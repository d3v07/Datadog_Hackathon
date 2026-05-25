import type { VendorId } from "@unsyphn/shared";

// Vendor-level audit log entries: PATCH mutations, contract uploads,
// renegotiation packet generations. Aggregated with ChangeReport state
// transitions + escalations to render the Activity tab.

export type VendorEventKind =
  | "vendor.patch"
  | "contract.upload"
  | "packet.generated"
  | "scan.triggered";

export interface VendorEvent {
  id: string;
  vendorId: VendorId;
  kind: VendorEventKind;
  actor: string;
  occurredAt: string;
  detail?: Record<string, unknown>;
}

export class VendorEventsStore {
  private byVendor = new Map<VendorId, VendorEvent[]>();
  private sequence = 0;

  add(input: Omit<VendorEvent, "id">): VendorEvent {
    this.sequence += 1;
    const stored: VendorEvent = {
      ...input,
      id: `vev_${String(this.sequence).padStart(6, "0")}`,
    };
    const existing = this.byVendor.get(input.vendorId) ?? [];
    this.byVendor.set(input.vendorId, [...existing, stored]);
    return { ...stored };
  }

  listByVendor(vendorId: VendorId): VendorEvent[] {
    return (this.byVendor.get(vendorId) ?? []).map((e) => ({ ...e }));
  }

  reset(): void {
    this.byVendor.clear();
    this.sequence = 0;
  }
}

export const vendorEventsStore = new VendorEventsStore();
