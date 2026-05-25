// Team — members list (from seeded users) + invites stub.

import { register } from "../router.js";
import { store } from "../store.js";
import {
  badRequest,
  newId,
  nowIso,
  ok,
  type MockRequest,
  type MockResponse,
} from "../types.js";

function members(req: MockRequest): MockResponse {
  const orgId = req.orgId ?? "org_acme";
  const list = [...store.users.values()]
    .filter((u) => u.orgId === orgId)
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      avatarLetter: u.avatarLetter ?? u.name.charAt(0).toUpperCase(),
    }));
  return ok({ members: list });
}

function invite(req: MockRequest): MockResponse {
  const body = (req.body ?? {}) as { email?: string; role?: string };
  if (!body.email) return badRequest("email is required");
  const record = {
    id: newId("inv"),
    email: body.email,
    role: body.role ?? "Procurement",
    invitedAt: nowIso(),
    status: "pending" as const,
  };
  store.teamInvites.set(record.id, record);
  return ok({ invited: record.email, status: record.status, invite: record });
}

export function registerTeamHandlers(): void {
  register("GET", /^\/v1\/team\/members$/, members);
  register("POST", /^\/v1\/team\/invites$/, invite);
}
