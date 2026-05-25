import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ChangeReport, Org, User, Vendor } from "@unsyphn/shared";
import { vendorStore } from "../db/vendor-store.js";
import { policyStore, type SeededPolicy } from "../db/policy-store.js";
import { renewalsStore, type RenewalRecord } from "../db/renewals-store.js";
import { requestsStore, type IntakeRequestRecord } from "../db/requests-store.js";
import {
  integrationsStore,
  type IntegrationRecord,
} from "../db/integrations-store.js";
import {
  customerContractsStore,
  type CustomerContractRecord,
} from "../db/customer-contracts-store.js";

// Locate seed/ relative to repo root. apps/api is two levels deep.
function seedDir(): string {
  return resolve(process.cwd(), "../../seed");
}

interface Caches {
  orgs: Map<string, Org>;
  users: Map<string, User>;
  tokens: Map<string, string>;
  changeReports: ChangeReport[];
}

const caches: Caches = {
  orgs: new Map(),
  users: new Map(),
  tokens: new Map(),
  changeReports: [],
};

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

export function loadSeeds(opts?: { seedDir?: string }): void {
  const dir = opts?.seedDir ?? seedDir();
  const orgs = readJson<Org[]>(resolve(dir, "orgs.json"));
  const users = readJson<User[]>(resolve(dir, "users.json"));
  const vendors = readJson<Vendor[]>(resolve(dir, "vendors.json"));
  const tokens = readJson<Record<string, string>>(resolve(dir, "tokens.json"));
  const policies = readJson<SeededPolicy[]>(resolve(dir, "policies.json"));
  const changeReports = readJson<ChangeReport[]>(
    resolve(dir, "change-reports.json"),
  );
  const renewals = readJson<RenewalRecord[]>(resolve(dir, "renewals.json"));
  const requests = readJson<IntakeRequestRecord[]>(resolve(dir, "requests.json"));
  const integrations = readJson<IntegrationRecord[]>(
    resolve(dir, "integrations.json"),
  );
  const customerContracts = readJson<CustomerContractRecord[]>(
    resolve(dir, "customer-contracts.json"),
  );

  caches.orgs.clear();
  caches.users.clear();
  caches.tokens.clear();
  caches.changeReports = changeReports;

  for (const o of orgs) caches.orgs.set(o.id, o);
  for (const u of users) caches.users.set(u.id, u);
  for (const [token, orgId] of Object.entries(tokens)) {
    caches.tokens.set(token, orgId);
  }

  vendorStore.load(vendors);
  policyStore.load(policies);
  renewalsStore.load(renewals);
  requestsStore.load(requests);
  integrationsStore.load(integrations);
  customerContractsStore.load(customerContracts);
}

// Exposes the seeded change reports so callers (e.g. index.ts boot) can
// hydrate the canonical ChangeReportRepository. Without this, lifecycle
// endpoints (acknowledge / snooze / resolve) 404 on seeded change ids.
export function getSeededChangeReports(): ChangeReport[] {
  return caches.changeReports;
}

export function getOrg(id: string): Org | undefined {
  return caches.orgs.get(id);
}

export function getUser(id: string): User | undefined {
  return caches.users.get(id);
}

export function listUsers(): User[] {
  return [...caches.users.values()];
}

export function resolveBearer(token: string): string | undefined {
  return caches.tokens.get(token);
}
