import type { Vendor } from "@redline/shared";

// Vendors live in-memory per handoff/Data Model §05. Seeded at boot; the Add
// Vendor flow appends to this cache at runtime.

export function normalizeHomepage(input: string): string {
  try {
    const u = new URL(input);
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    const port = u.port ? `:${u.port}` : "";
    return `${u.protocol}//${host}${port}/`;
  } catch {
    return input.trim().toLowerCase();
  }
}

export class VendorStore {
  private byId = new Map<string, Vendor>();
  private idByNormalizedHomepage = new Map<string, string>();

  load(vendors: Vendor[]): void {
    this.byId.clear();
    this.idByNormalizedHomepage.clear();
    for (const v of vendors) this.add(v);
  }

  add(v: Vendor): void {
    this.byId.set(v.id, v);
    if (v.urls?.homepage) {
      this.idByNormalizedHomepage.set(normalizeHomepage(v.urls.homepage), v.id);
    }
  }

  get(id: string): Vendor | undefined {
    return this.byId.get(id);
  }

  list(orgId: string): Vendor[] {
    return [...this.byId.values()].filter((v) => v.orgId === orgId);
  }

  findByHomepage(orgId: string, homepageUrl: string): Vendor | undefined {
    const key = normalizeHomepage(homepageUrl);
    const id = this.idByNormalizedHomepage.get(key);
    if (!id) return undefined;
    const v = this.byId.get(id);
    return v && v.orgId === orgId ? v : undefined;
  }
}

export const vendorStore = new VendorStore();
