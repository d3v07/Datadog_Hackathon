import { Hono } from "hono";
import { z } from "zod";
import { ErrorCodes } from "@unsyphn/shared";
import { ApiError } from "../lib/errors.js";
import { env } from "../env.js";
import {
  COMPLIANCE_PACK,
  ensureStripeProducts,
  stripe,
} from "../providers/stripe.js";
import { getOrg } from "../seed/loader.js";
import { newId } from "../lib/ids.js";
import { actionStore } from "../db/actions.js";
import { setEntitlement } from "../lib/entitlements.js";

export const billingRoute = new Hono();

const PaymentIntentBodySchema = z.object({
  sku: z.literal(COMPLIANCE_PACK.id),
});

billingRoute.get("/products", (c) => {
  const orgId = c.get("orgId");
  const org = getOrg(orgId);
  return c.json({
    data: [
      {
        id: COMPLIANCE_PACK.id,
        name: COMPLIANCE_PACK.name,
        description: COMPLIANCE_PACK.description,
        priceUsdCents: COMPLIANCE_PACK.amountUsdCents,
        currency: COMPLIANCE_PACK.currency,
        billing: "one-time",
        features: [
          "Evidence Bundles",
          "Auditor portal access",
          "Vanta / Drata push",
          "Signed PDF exports",
        ],
      },
    ],
    orgEntitlements: {
      compliancePack: org?.entitlements.compliancePack ?? false,
    },
  });
});

billingRoute.post("/payment-intents", async (c) => {
  const orgId = c.get("orgId");
  const org = getOrg(orgId);
  if (!org) {
    throw new ApiError(ErrorCodes.NotFound, `Org ${orgId} not found`);
  }
  if (org.entitlements.compliancePack) {
    throw new ApiError(
      ErrorCodes.Conflict,
      "Org already has the Compliance Pack entitlement",
    );
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    throw new ApiError(ErrorCodes.ValidationFailed, "Body must be JSON");
  }
  const parsed = PaymentIntentBodySchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new ApiError(
      ErrorCodes.ValidationFailed,
      issue ? `${issue.path.join(".")}: ${issue.message}` : "Invalid body",
      { issues: parsed.error.issues },
    );
  }

  await ensureStripeProducts();
  const e = env();
  if (!e.STRIPE_PUBLISHABLE_KEY) {
    throw new ApiError(
      ErrorCodes.Internal,
      "STRIPE_PUBLISHABLE_KEY not configured on server",
    );
  }

  try {
    const intent = await stripe().paymentIntents.create({
      amount: COMPLIANCE_PACK.amountUsdCents,
      currency: COMPLIANCE_PACK.currency,
      automatic_payment_methods: { enabled: true },
      metadata: { orgId, sku: COMPLIANCE_PACK.id },
    });
    return c.json({
      paymentIntentId: intent.id,
      clientSecret: intent.client_secret,
      amountUsdCents: COMPLIANCE_PACK.amountUsdCents,
      currency: COMPLIANCE_PACK.currency,
      publishableKey: e.STRIPE_PUBLISHABLE_KEY,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "stripe error";
    throw new ApiError(ErrorCodes.UpstreamFailed, message, {
      provider: "stripe",
    });
  }
});

// Runbook F5 fallback: when Stripe Elements fails on stage, the modal's hidden
// Shift+Enter handler hits this endpoint to simulate the same effect as a real
// payment_intent.succeeded webhook. Disabled in production.
billingRoute.post("/simulate-success", async (c) => {
  if (env().NODE_ENV === "production") {
    throw new ApiError(ErrorCodes.NotFound, "Not available in production");
  }
  const orgId = c.get("orgId");
  const org = getOrg(orgId);
  if (!org) throw new ApiError(ErrorCodes.NotFound, `Org ${orgId} not found`);

  const fakeIntentId = `pi_dev_${Date.now()}`;
  setEntitlement(orgId, "compliancePack", true);
  await actionStore().insert({
    id: newId("action"),
    orgId,
    kind: "payment",
    target: "stripe",
    payload: {
      paymentIntentId: fakeIntentId,
      amount: COMPLIANCE_PACK.amountUsdCents,
      currency: COMPLIANCE_PACK.currency,
      sku: COMPLIANCE_PACK.id,
      simulated: true,
    },
    firedAt: new Date().toISOString(),
    status: "delivered",
    externalId: fakeIntentId,
  });
  return c.json({ ok: true, paymentIntentId: fakeIntentId });
});
