import { Hono } from "hono";
import { z } from "zod";
import { ErrorCodes } from "@unsyphn/shared";
import {
  integrationsStore,
  type IntegrationCategory,
} from "../db/integrations-store.js";
import { ApiError } from "../lib/errors.js";

const VALID_CATEGORIES: ReadonlyArray<IntegrationCategory> = ["inbound", "outbound"];

const connectSchema = z
  .object({
    // Phase 7 — primary field name. `fields` retained for backwards compat
    // with the earliest Phase 0 spike clients before they upgrade.
    values: z.record(z.string(), z.string()).optional(),
    fields: z.record(z.string(), z.string()).optional(),
    scopes: z.array(z.string()).optional(),
    connectedAs: z.string().optional(),
  })
  .strict();

export const integrationsRoute = new Hono();

integrationsRoute.get("/", (c) => {
  const category = c.req.query("category");
  if (category && !(VALID_CATEGORIES as ReadonlyArray<string>).includes(category)) {
    throw new ApiError(
      ErrorCodes.Unprocessable,
      `category must be one of: ${VALID_CATEGORIES.join(", ")}`,
    );
  }
  const integrations = integrationsStore.list(
    category ? { category: category as IntegrationCategory } : undefined,
  );
  return c.json({ integrations });
});

integrationsRoute.post("/:id/connect", async (c) => {
  const id = c.req.param("id");
  const parsed = connectSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    throw new ApiError(ErrorCodes.Unprocessable, "Request body is invalid", {
      issues: parsed.error.flatten(),
    });
  }
  const values = parsed.data.values ?? parsed.data.fields;
  const updated = integrationsStore.connect(id, {
    ...(values ? { values } : {}),
    ...(parsed.data.scopes ? { scopes: parsed.data.scopes } : {}),
    ...(parsed.data.connectedAs ? { connectedAs: parsed.data.connectedAs } : {}),
  });
  if (!updated) {
    throw new ApiError(ErrorCodes.NotFound, `No integration found with id ${id}`);
  }
  return c.json({ integration: updated });
});

integrationsRoute.post("/:id/disconnect", (c) => {
  const id = c.req.param("id");
  const updated = integrationsStore.disconnect(id);
  if (!updated) {
    throw new ApiError(ErrorCodes.NotFound, `No integration found with id ${id}`);
  }
  return c.json({ integration: updated });
});

integrationsRoute.post("/:id/sync", (c) => {
  const id = c.req.param("id");
  const existing = integrationsStore.get(id);
  if (!existing) {
    throw new ApiError(ErrorCodes.NotFound, `No integration found with id ${id}`);
  }
  if (!existing.connected) {
    throw new ApiError(
      ErrorCodes.Unprocessable,
      "Integration must be connected before it can sync",
    );
  }
  const recordsScanned = 100 + Math.floor(Math.random() * 7900);
  const sync = integrationsStore.recordSync(id, recordsScanned);
  return c.json({ synced: true, recordsScanned, sync });
});

integrationsRoute.get("/:id/syncs", (c) => {
  const id = c.req.param("id");
  const existing = integrationsStore.get(id);
  if (!existing) {
    throw new ApiError(ErrorCodes.NotFound, `No integration found with id ${id}`);
  }
  const syncs = integrationsStore.syncHistory(id, 5);
  return c.json({ syncs });
});
