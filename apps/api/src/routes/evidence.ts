import { Hono } from "hono";
import type { EvidenceBriefResponse } from "@redline/shared";
import { ErrorCodes } from "@redline/shared";
import { ApiError } from "../lib/errors.js";
import { changeReportStore } from "../db/change-reports.js";
import { policyStore } from "../db/policy-store.js";
import { vendorStore } from "../db/vendor-store.js";

// Public evidence brief fallback. The API is /v1/evidence/:id so it does not
// collide with the SPA /evidence/:id history route.

export const evidenceRoute = new Hono();

evidenceRoute.get("/:id", (c) => {
  const id = c.req.param("id");
  const report = changeReportStore.get(id);
  if (!report) {
    throw new ApiError(
      ErrorCodes.NotFound,
      `No evidence brief for id ${id}`,
    );
  }

  const vendor = vendorStore.get(report.vendorId);
  const policyFired = policyStore.get(report.policyFiredId);
  const policyAlsoMatched = report.policyAlsoMatched
    .map((pid) => policyStore.get(pid))
    .filter((p): p is NonNullable<typeof p> => p !== undefined)
    .map((p) => ({ id: p.id, name: p.name }));

  const response: EvidenceBriefResponse = {
    changeReport: report,
    vendor: {
      id: vendor?.id ?? report.vendorId,
      name: vendor?.name ?? "Unknown vendor",
      category: vendor?.category ?? "uncategorized",
    },
    policyFired: {
      id: policyFired?.id ?? report.policyFiredId,
      name: policyFired?.name ?? "Unknown policy",
    },
    policyAlsoMatched,
    // Actions are persisted to ClickHouse by the agent runner; for seeded
    // reports the array is empty until Track A's runner produces them.
    actionSummary: [],
  };

  return c.json(response);
});
