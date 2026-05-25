import { Hono } from "hono";
import type { Lens, Severity } from "@unsyphn/shared";
import { getSeededChangeReports } from "../seed/loader.js";
import { toInboxItem } from "../lib/change-report-views.js";

export const inboxRoute = new Hono();

inboxRoute.get("/", (c) => {
  const filter = c.req.query("filter") ?? "all";
  const severity = c.req.query("severity") ?? "all";
  const lens = c.req.query("lens");
  const limit = Math.min(Number(c.req.query("limit") ?? 50), 200);

  const reports = getSeededChangeReports().filter((r) => r.state !== "resolved");
  let items = reports.map(toInboxItem);

  // Inbox kind has only been "change" since material-changes.json was retired;
  // legacy callers still send filter=changes|all, treat both as no-op filters
  // and let the kind enum guard future expansion.
  if (filter !== "all" && filter !== "changes") {
    items = items.filter((item) => item.kind === filter);
  }

  if (severity !== "all") {
    items = items.filter((item) => item.severity === (severity as Severity));
  }

  // Phase 2: LensChips now sends the active role. Apply lens filter when set;
  // if the filter empties the list, fall back to the unfiltered set so the
  // user doesn't see a bare inbox on a quiet role-lens. When nothing exists
  // pre-filter, return empty so the client can render its per-role empty copy.
  if (lens && lens !== "all") {
    const filtered = items.filter((item) =>
      (item.lensTags as string[]).includes(lens as Lens),
    );
    if (filtered.length > 0 || items.length === 0) {
      items = filtered;
    }
  }

  items = items
    .slice()
    .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt))
    .slice(0, limit);

  return c.json({ items, total: items.length });
});
