import type { Renewal, RenewalStatus } from "@unsyphn/shared";
import { DEMO_BEARER_TOKEN } from "../../lib/api.js";

export interface RenewalsResponse {
  renewals: Renewal[];
}

export interface RenewalResponse {
  renewal: Renewal;
}

export interface RenewalPatchBody {
  column?: RenewalStatus;
  ownerId?: string;
  declined?: boolean;
  autoRenewed?: boolean;
}

function bearer(): string {
  if (typeof window === "undefined") return DEMO_BEARER_TOKEN;
  return window.localStorage.getItem("unsyphn:bearer") ?? DEMO_BEARER_TOKEN;
}

export async function fetchRenewals(days: number): Promise<Renewal[]> {
  const resp = await fetch(`/v1/renewals?days=${days}`, {
    headers: { Authorization: `Bearer ${bearer()}` },
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data = (await resp.json()) as RenewalsResponse;
  return data.renewals;
}

export async function postRenewalStatus(
  id: string,
  column: RenewalStatus,
): Promise<Renewal> {
  const resp = await fetch(`/v1/renewals/${encodeURIComponent(id)}/status`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${bearer()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ column }),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data = (await resp.json()) as RenewalResponse;
  return data.renewal;
}

export async function patchRenewal(
  id: string,
  patch: RenewalPatchBody,
): Promise<Renewal> {
  const resp = await fetch(`/v1/renewals/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${bearer()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(patch),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data = (await resp.json()) as RenewalResponse;
  return data.renewal;
}
