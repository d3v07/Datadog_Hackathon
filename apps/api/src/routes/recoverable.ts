import { Hono } from "hono";
import type { Recoverable } from "@unsyphn/shared";

const RECOVERABLE_STUB: Recoverable = {
  totalUsd: 135000,
  breakdown: {
    unusedSeatsUsd: 42000,
    priceHikesUsd: 28000,
    duplicateAppsUsd: 18000,
    atRiskUsd: 47000,
  },
};

export const recoverableRoute = new Hono();

recoverableRoute.get("/", (c) => c.json(RECOVERABLE_STUB));
