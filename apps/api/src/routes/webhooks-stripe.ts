import { Hono } from "hono";
import Stripe from "stripe";
import { ErrorCodes } from "@redline/shared";
import { ApiError } from "../lib/errors.js";
import { env } from "../env.js";
import { stripe } from "../providers/stripe.js";
import { newId } from "../lib/ids.js";
import { actionStore } from "../db/actions.js";
import { setEntitlement } from "../lib/entitlements.js";
import { logger } from "../logger.js";

// Stripe inbound webhook. The route is mounted at /webhooks/stripe and is
// excluded from bearer auth in src/auth.ts. Signature verification happens
// against the raw request body (handoff/API §07).

export const stripeWebhookRoute = new Hono();

stripeWebhookRoute.post("/", async (c) => {
  const e = env();
  if (!e.STRIPE_WEBHOOK_SECRET) {
    throw new ApiError(
      ErrorCodes.Internal,
      "STRIPE_WEBHOOK_SECRET not configured",
    );
  }
  const signature = c.req.header("stripe-signature");
  if (!signature) {
    throw new ApiError(
      ErrorCodes.ValidationFailed,
      "Missing Stripe-Signature header",
    );
  }
  const rawBody = await c.req.raw.text();

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(
      rawBody,
      signature,
      e.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "signature verification failed";
    throw new ApiError(ErrorCodes.ValidationFailed, message, {
      provider: "stripe",
    });
  }

  // Always return 200 quickly (handoff/API §07: "Stripe retries on non-2xx
  // for 3 days. Process async if heavy work."). Our work is light; we do it
  // inline.
  switch (event.type) {
    case "payment_intent.succeeded": {
      await handleSucceeded(event.data.object);
      break;
    }
    case "payment_intent.payment_failed": {
      await handleFailed(event.data.object);
      break;
    }
    default:
      // Unknown / out-of-scope events still get a 200 so Stripe doesn't retry.
      break;
  }

  return c.json({ received: true });
});

async function handleSucceeded(intent: Stripe.PaymentIntent): Promise<void> {
  const orgId = intent.metadata?.orgId;
  if (!orgId) {
    logger.warn({ paymentIntentId: intent.id }, "Stripe payment_intent.succeeded missing metadata.orgId");
    return;
  }
  setEntitlement(orgId, "compliancePack", true);

  await actionStore().insert({
    id: newId("action"),
    orgId,
    kind: "payment",
    target: "stripe",
    payload: {
      paymentIntentId: intent.id,
      amount: intent.amount,
      currency: intent.currency,
      sku: intent.metadata?.sku ?? null,
    },
    firedAt: new Date().toISOString(),
    status: "delivered",
    externalId: intent.id,
  });
}

async function handleFailed(intent: Stripe.PaymentIntent): Promise<void> {
  const orgId = intent.metadata?.orgId ?? "";
  await actionStore().insert({
    id: newId("action"),
    orgId,
    kind: "payment",
    target: "stripe",
    payload: {
      paymentIntentId: intent.id,
      amount: intent.amount,
      currency: intent.currency,
      sku: intent.metadata?.sku ?? null,
      lastPaymentError: intent.last_payment_error?.message ?? null,
    },
    firedAt: new Date().toISOString(),
    status: "failed",
    externalId: intent.id,
    error: intent.last_payment_error?.message ?? "payment_failed",
  });
}
