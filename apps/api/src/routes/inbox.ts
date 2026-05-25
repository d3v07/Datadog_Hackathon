import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { Hono } from "hono";
import type { InboxItem, Lens, Severity } from "@unsyphn/shared";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface MaterialChange extends InboxItem {
  category: string;
  diff: { before: string; after: string };
  citations: Array<{ url?: string; quote?: string; fetchedAt?: string }>;
}

function loadMaterialChanges(): InboxItem[] {
  const path = resolve(__dirname, "../seed/material-changes.json");
  const raw = JSON.parse(readFileSync(path, "utf8")) as MaterialChange[];
  return raw.map(({ diff: _diff, citations: _citations, category: _category, ...item }) => item);
}

export const inboxRoute = new Hono();

inboxRoute.get("/", (c) => {
  const filter = c.req.query("filter") ?? "all";
  const severity = c.req.query("severity") ?? "all";
  const lens = (c.req.query("lens") ?? "procurement") as Lens;
  const limit = Math.min(Number(c.req.query("limit") ?? 50), 200);

  let items = loadMaterialChanges();

  // URL filter values are plural ("changes", "renewals", "unused-seats"); kinds are singular.
  const filterKindMap: Record<string, string> = {
    changes: "change",
    renewals: "renewal",
    "unused-seats": "unused-seats",
  };
  const normalizedFilter = filterKindMap[filter] ?? filter;

  if (filter !== "all") {
    items = items.filter((item) => item.kind === normalizedFilter);
  }

  if (severity !== "all") {
    items = items.filter((item) => item.severity === (severity as Severity));
  }

  if (lens !== "procurement") {
    items = items.filter((item) => (item.lensTags as string[]).includes(lens));
  }

  items = items.slice(0, limit);

  return c.json({ items, total: items.length });
});
