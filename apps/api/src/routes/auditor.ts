import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";
import { Hono } from "hono";
import { z } from "zod";
import type { OrgId } from "@unsyphn/shared";
import { errorResponse } from "../errors.js";
import { resolveBearer, getUser } from "../seed/loader.js";
import { vendorStore } from "../db/vendor-store.js";

const AUDITOR_SECRET = process.env.AUDITOR_SECRET ?? "demo-secret-rotate-in-prod";
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL ?? "http://localhost:4321";

interface AuditorPayload {
  sessionId: string;
  orgId: OrgId;
  vendorIds?: string[];
  expiresAt: number;
}

interface VendorSummary {
  id: string;
  name: string;
  ownerEmail: string;
  annualSpendUsd: number;
  changeCount: number;
  posture: string;
}

interface ChangeReport {
  id: string;
  vendorId: string;
  vendorName: string;
  severity: string;
  title: string;
  actor: string;
  timestamp: string;
}

interface ActivityEvent {
  id: string;
  kind: string;
  vendorId: string;
  vendorName: string;
  actor: string;
  timestamp: string;
  detail: string;
}

function sign(payload: string): string {
  return createHmac("sha256", AUDITOR_SECRET).update(payload).digest("base64url");
}

function buildToken(payload: AuditorPayload): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

function verifyToken(token: string): AuditorPayload | null {
  const dotIdx = token.lastIndexOf(".");
  if (dotIdx === -1) return null;

  const encoded = token.slice(0, dotIdx);
  const sig = token.slice(dotIdx + 1);

  const expected = sign(encoded);
  try {
    const expectedBuf = Buffer.from(expected, "utf8");
    const actualBuf = Buffer.from(sig, "utf8");
    if (expectedBuf.length !== actualBuf.length) return null;
    if (!timingSafeEqual(expectedBuf, actualBuf)) return null;
  } catch {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as AuditorPayload;
    if (payload.expiresAt < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

const CreateSessionSchema = z.object({
  vendorIds: z.array(z.string()).optional(),
  expiresInDays: z.number().int().min(1).max(365),
});

export const auditorRoute = new Hono();

auditorRoute.post("/sessions", async (c) => {
  const bearerToken = c.req.header("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!bearerToken) return errorResponse(c, 401, "unauthenticated", "Missing bearer token");

  const orgId = resolveBearer(bearerToken);
  if (!orgId) return errorResponse(c, 401, "unauthenticated", "Invalid bearer token");

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return errorResponse(c, 422, "unprocessable", "Invalid JSON body");
  }

  const parsed = CreateSessionSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(c, 422, "validation-failed", parsed.error.issues[0]?.message ?? "Validation failed");
  }

  const { vendorIds, expiresInDays } = parsed.data;
  const expiresAt = Date.now() + expiresInDays * 24 * 60 * 60 * 1000;

  const payload: AuditorPayload = {
    sessionId: `sess_${randomUUID().replace(/-/g, "").slice(0, 8)}`,
    orgId: orgId as OrgId,
    expiresAt,
    ...(vendorIds ? { vendorIds } : {}),
  };

  const sessionToken = buildToken(payload);
  const shareUrl = `${PUBLIC_BASE_URL}/auditor/${sessionToken}`;

  return c.json({ sessionToken, shareUrl, expiresAt: new Date(expiresAt).toISOString() });
});

auditorRoute.get("/sessions/:token", async (c) => {
  const token = c.req.param("token");
  const payload = verifyToken(token);

  if (!payload) return errorResponse(c, 401, "unauthenticated", "Auditor link has expired or is invalid");

  const { orgId, vendorIds } = payload;

  const allVendors = vendorStore.list(orgId);
  const scoped = vendorIds
    ? allVendors.filter((v) => vendorIds.includes(v.id))
    : allVendors;

  const vendors: VendorSummary[] = scoped.map((v) => {
    const owner = v.ownerId ? getUser(v.ownerId) : undefined;
    return {
      id: v.id,
      name: v.name,
      ownerEmail: owner?.email ?? "unknown@org.dev",
      annualSpendUsd: v.contract?.annualSpendUsd ?? 0,
      changeCount: v.latestChangeId ? 1 : 0,
      posture: v.posture ?? "ok",
    };
  });

  const changes: ChangeReport[] = scoped
    .filter((v) => v.latestChangeId)
    .map((v) => ({
      id: v.latestChangeId ?? "",
      vendorId: v.id,
      vendorName: v.name,
      severity: "P2",
      title: `Change detected for ${v.name}`,
      actor: "system",
      timestamp: v.lastScanAt ?? new Date().toISOString(),
    }));

  const activityLog: ActivityEvent[] = scoped.flatMap((v) => {
    const events: ActivityEvent[] = [];
    if (v.lastScanAt) {
      events.push({
        id: `evt_scan_${v.id}`,
        kind: "scan.completed",
        vendorId: v.id,
        vendorName: v.name,
        actor: "system",
        timestamp: v.lastScanAt,
        detail: `Monitoring scan completed for ${v.name}`,
      });
    }
    if (v.latestChangeId) {
      events.push({
        id: `evt_change_${v.id}`,
        kind: "change.detected",
        vendorId: v.id,
        vendorName: v.name,
        actor: "system",
        timestamp: v.lastScanAt ?? new Date().toISOString(),
        detail: `Material change detected`,
      });
    }
    return events;
  });

  activityLog.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return c.json({
    orgId,
    vendorIds: vendorIds ?? null,
    expiresAt: new Date(payload.expiresAt).toISOString(),
    sessionId: payload.sessionId,
    vendors,
    changes,
    activityLog,
  });
});
