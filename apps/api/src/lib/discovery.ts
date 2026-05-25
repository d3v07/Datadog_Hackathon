import type { VendorUrls } from "@unsyphn/shared";

// Discover the six monitored URLs from a homepage. For each URL kind we probe
// a short list of common paths under the homepage origin via HEAD; the first
// 2xx wins. `fetch` is injectable so tests can run without network.

export type DiscoveryKey = Exclude<keyof VendorUrls, "homepage">;

const CANDIDATES: Record<DiscoveryKey, readonly string[]> = {
  terms: ["/terms", "/legal/terms", "/terms-of-service", "/tos"],
  pricing: ["/pricing", "/plans", "/pricing.html"],
  dpa: ["/dpa", "/legal/dpa", "/data-processing-agreement"],
  subProcessors: [
    "/subprocessors",
    "/sub-processors",
    "/legal/subprocessors",
    "/subprocessor-list",
  ],
  security: ["/security", "/trust/security", "/legal/security"],
  sla: ["/sla", "/legal/sla", "/service-level-agreement"],
};

const DISCOVERY_TIMEOUT_MS = 4000;

export interface DiscoveryResult {
  found: Partial<Record<DiscoveryKey, string>>;
  missing: DiscoveryKey[];
  homepageOrigin: string;
}

type Fetcher = (
  url: string,
  init: { method: "HEAD"; signal: AbortSignal },
) => Promise<{ ok: boolean; status: number }>;

const defaultFetcher: Fetcher = async (url, init) => {
  const resp = await fetch(url, init);
  return { ok: resp.ok, status: resp.status };
};

export interface DiscoveryOptions {
  fetcher?: Fetcher;
  timeoutMs?: number;
}

function deriveOrigin(homepageUrl: string): string {
  const u = new URL(homepageUrl);
  return `${u.protocol}//${u.host}`;
}

async function probe(
  url: string,
  fetcher: Fetcher,
  timeoutMs: number,
): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetcher(url, {
      method: "HEAD",
      signal: controller.signal,
    });
    return resp.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export async function discoverUrls(
  homepageUrl: string,
  options: DiscoveryOptions = {},
): Promise<DiscoveryResult> {
  const fetcher = options.fetcher ?? defaultFetcher;
  const timeout = options.timeoutMs ?? DISCOVERY_TIMEOUT_MS;
  const origin = deriveOrigin(homepageUrl);

  const found: Partial<Record<DiscoveryKey, string>> = {};
  const missing: DiscoveryKey[] = [];

  await Promise.all(
    (Object.keys(CANDIDATES) as DiscoveryKey[]).map(async (key) => {
      for (const path of CANDIDATES[key]) {
        const candidate = `${origin}${path}`;
        // eslint-disable-next-line no-await-in-loop
        const ok = await probe(candidate, fetcher, timeout);
        if (ok) {
          found[key] = candidate;
          return;
        }
      }
      missing.push(key);
    }),
  );

  return { found, missing, homepageOrigin: origin };
}
