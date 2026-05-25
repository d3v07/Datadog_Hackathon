import type { Org } from "@unsyphn/shared";
import { bus } from "./bus.js";
import { getOrg } from "../seed/loader.js";

// Orgs are in-memory per handoff/Data Model §05. The Stripe webhook flips
// the compliancePack flag and broadcasts via the bus so the UI's Stripe modal
// can switch to the success state.

export type EntitlementKey = keyof Org["entitlements"];

export function setEntitlement(
  orgId: string,
  key: EntitlementKey,
  value: boolean,
): { changed: boolean; org: Org } {
  const org = getOrg(orgId);
  if (!org) throw new Error(`Org ${orgId} not found`);
  const before = org.entitlements[key];
  if (before === value) {
    return { changed: false, org };
  }
  org.entitlements[key] = value;
  bus.publish(orgId, {
    event: "org.entitlements.changed",
    data: {
      compliancePack: org.entitlements.compliancePack,
      auditorPortal: org.entitlements.auditorPortal,
      changedAt: new Date().toISOString(),
    },
  });
  return { changed: true, org };
}
