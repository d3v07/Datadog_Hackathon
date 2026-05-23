import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Org, User, Vendor } from "@redline/shared";
import { vendorStore } from "../db/vendor-store.js";

// Locate seed/ relative to repo root. apps/api is two levels deep.
function seedDir(): string {
  return resolve(process.cwd(), "../../seed");
}

interface Caches {
  orgs: Map<string, Org>;
  users: Map<string, User>;
  tokens: Map<string, string>; // bearer-token → orgId
}

const caches: Caches = {
  orgs: new Map(),
  users: new Map(),
  tokens: new Map(),
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

  caches.orgs.clear();
  caches.users.clear();
  caches.tokens.clear();

  for (const o of orgs) caches.orgs.set(o.id, o);
  for (const u of users) caches.users.set(u.id, u);
  for (const [token, orgId] of Object.entries(tokens)) {
    caches.tokens.set(token, orgId);
  }

  vendorStore.load(vendors);
}

export function getOrg(id: string): Org | undefined {
  return caches.orgs.get(id);
}

export function getUser(id: string): User | undefined {
  return caches.users.get(id);
}

export function resolveBearer(token: string): string | undefined {
  return caches.tokens.get(token);
}
