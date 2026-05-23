import { ulid } from "ulid";

// Id prefixes from handoff/Data Model §02.
export const IdPrefix = {
  org: "org",
  user: "usr",
  vendor: "vnd",
  policy: "pol",
  snapshot: "snp",
  changeReport: "chg",
  action: "act",
  run: "run",
  bundle: "bnd",
} as const;

export type IdPrefixKey = keyof typeof IdPrefix;

export function newId(kind: IdPrefixKey): string {
  return `${IdPrefix[kind]}_${ulid().toLowerCase()}`;
}

export function newRequestId(): string {
  return `req_${ulid().toLowerCase()}`;
}
