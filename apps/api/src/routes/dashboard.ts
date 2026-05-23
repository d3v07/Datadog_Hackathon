import { Hono } from "hono";

export const dashboardRoute = new Hono();

dashboardRoute.get("/summary", (c) => {
  const _orgId = c.get("orgId");
  return c.json({ vendorCount: 27, annualRunRateUsd: 5026200, openChangeCount: 3 });
});
