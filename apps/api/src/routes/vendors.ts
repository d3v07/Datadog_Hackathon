import { Hono } from "hono";
import { z } from "zod";
import {
  ErrorCodes,
  VendorCreateSchema,
  type Vendor,
  type VendorCreateResponse,
  type VendorUrls,
} from "@redline/shared";
import { ApiError } from "../lib/errors.js";
import { newId } from "../lib/ids.js";
import { discoverUrls, type DiscoveryOptions } from "../lib/discovery.js";
import { vendorStore } from "../db/vendor-store.js";
import { getUser } from "../seed/loader.js";
import { queueFirstScan } from "../agent/queue.js";

export interface VendorsRouteOverrides {
  discovery?: DiscoveryOptions;
  stubRunner?: { stageDelayMs?: number };
}

let overrides: VendorsRouteOverrides = {};

// Tests use this to inject a mock fetcher and a 0ms stage delay so the runner
// resolves synchronously enough to assert on.
export function setVendorsRouteOverrides(o: VendorsRouteOverrides): void {
  overrides = o;
}

function flattenZodIssue(err: z.ZodError): {
  message: string;
  details: Record<string, unknown>;
} {
  const issue = err.issues[0];
  if (!issue) return { message: "Body did not parse", details: {} };
  const path = issue.path.join(".");
  return {
    message: path ? `${path}: ${issue.message}` : issue.message,
    details: { path: issue.path, issues: err.issues },
  };
}

export const vendorsRoute = new Hono();

vendorsRoute.post("/", async (c) => {
  const orgId = c.get("orgId");

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    throw new ApiError(ErrorCodes.ValidationFailed, "Body must be JSON");
  }

  const parsed = VendorCreateSchema.safeParse(body);
  if (!parsed.success) {
    const { message, details } = flattenZodIssue(parsed.error);
    throw new ApiError(ErrorCodes.ValidationFailed, message, details);
  }
  const input = parsed.data;

  // Owner must exist in the calling org.
  const owner = getUser(input.ownerId);
  if (!owner || owner.orgId !== orgId) {
    throw new ApiError(
      ErrorCodes.Unprocessable,
      `ownerId ${input.ownerId} is not a user in this org`,
      { path: ["ownerId"] },
    );
  }

  // Duplicate detection by normalized homepage within the org.
  const dupe = vendorStore.findByHomepage(orgId, input.homepageUrl);
  if (dupe) {
    throw new ApiError(
      ErrorCodes.Duplicate,
      `A vendor with this homepage already exists`,
      { vendorId: dupe.id, name: dupe.name },
    );
  }

  // URL discovery. Returns 422 if any of the 6 monitored URLs can't be found.
  const discovered = await discoverUrls(input.homepageUrl, overrides.discovery);
  if (discovered.missing.length > 0) {
    throw new ApiError(
      ErrorCodes.DiscoveryIncomplete,
      `Could not discover ${discovered.missing.join(", ")} from ${input.homepageUrl}`,
      { found: discovered.found, missing: discovered.missing },
    );
  }

  const urls: VendorUrls = {
    homepage: input.homepageUrl,
    terms: discovered.found.terms!,
    pricing: discovered.found.pricing!,
    dpa: discovered.found.dpa!,
    subProcessors: discovered.found.subProcessors!,
    security: discovered.found.security!,
    sla: discovered.found.sla!,
  };

  const vendor: Vendor = {
    id: newId("vendor"),
    orgId,
    name: input.name,
    category: "uncategorized",
    tier: input.tier,
    posture: "ok",
    dataClasses: input.dataClasses,
    ownerId: input.ownerId,
    urls,
  };
  if (input.contract) vendor.contract = input.contract;
  vendorStore.add(vendor);

  const { runId } = await queueFirstScan(
    { orgId, vendorId: vendor.id },
    overrides.stubRunner,
  );

  const response: VendorCreateResponse = {
    id: vendor.id,
    name: vendor.name,
    firstScanRunId: runId,
    discoveredUrls: urls,
  };
  return c.json(response, 201);
});
