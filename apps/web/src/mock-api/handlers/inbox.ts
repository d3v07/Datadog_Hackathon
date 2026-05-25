// Inbox surface — mirrors apps/api/src/routes/inbox.ts. Filters by severity
// and lens; lens filter falls back to the unfiltered list when the slice is
// empty so the user never sees a bare inbox on a quiet role.

import type { Lens, Severity } from "@unsyphn/shared";
import { changeReportsForOrg, toInboxItem } from "../projections.js";
import { register } from "../router.js";
import { ok, type MockRequest, type MockResponse } from "../types.js";

function listInbox(req: MockRequest): MockResponse {
  const orgId = req.orgId ?? "org_acme";
  const filter = req.query.get("filter") ?? "all";
  const severity = req.query.get("severity") ?? "all";
  const lens = req.query.get("lens");
  const limit = Math.min(Number(req.query.get("limit") ?? 50), 200);

  const reports = changeReportsForOrg(orgId).filter((r) => r.state !== "resolved");
  let items = reports.map(toInboxItem);

  if (filter !== "all" && filter !== "changes") {
    items = items.filter((item) => item.kind === filter);
  }
  if (severity !== "all") {
    items = items.filter((item) => item.severity === (severity as Severity));
  }
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

  return ok({ items, total: items.length });
}

export function registerInboxHandlers(): void {
  register("GET", /^\/v1\/inbox$/, listInbox);
}
