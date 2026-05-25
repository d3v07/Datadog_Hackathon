import { Hono } from "hono";
import { z } from "zod";
import { ErrorCodes } from "@unsyphn/shared";
import { ApiError } from "../lib/errors.js";
import { listUsers } from "../seed/loader.js";

const inviteSchema = z
  .object({
    email: z.string().email(),
    role: z.string().min(1).optional(),
  })
  .strict();

interface PendingInvite {
  id: string;
  email: string;
  role: string;
  invitedAt: string;
  status: "pending";
}

const invites = new Map<string, PendingInvite>();

export const teamRoute = new Hono();

teamRoute.get("/members", (c) => {
  const orgId = c.get("orgId");
  const members = listUsers()
    .filter((u) => u.orgId === orgId)
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      avatarLetter: u.avatarLetter ?? u.name.charAt(0).toUpperCase(),
    }));
  return c.json({ members });
});

teamRoute.post("/invites", async (c) => {
  const parsed = inviteSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    throw new ApiError(ErrorCodes.Unprocessable, "Request body is invalid", {
      issues: parsed.error.flatten(),
    });
  }
  const invite: PendingInvite = {
    id: `inv_${Date.now()}`,
    email: parsed.data.email,
    role: parsed.data.role ?? "Procurement",
    invitedAt: new Date().toISOString(),
    status: "pending",
  };
  invites.set(invite.id, invite);
  return c.json({ invited: invite.email, status: invite.status, invite });
});
