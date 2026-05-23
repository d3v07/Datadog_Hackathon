import { describe, it, expect, beforeEach } from "vitest";
import Stripe from "stripe";
import { resolve } from "node:path";
import { buildApp } from "../../apps/api/src/server.js";
import { loadSeeds, getOrg } from "../../apps/api/src/seed/loader.js";
import { setActionStore } from "../../apps/api/src/db/actions.js";
import { bus, type BusEnvelope } from "../../apps/api/src/lib/bus.js";
import {
  resetStripe,
  setStripeInstance,
} from "../../apps/api/src/providers/stripe.js";
import { InMemoryActionStore } from "../helpers/in-memory-action-store.js";

const SEED_DIR = resolve(__dirname, "../../seed");
const WHSEC = process.env.STRIPE_WEBHOOK_SECRET!;

// We use the real Stripe SDK for signature generation/verification. It needs
// a "secret key" at instantiation but never hits the network in this test —
// `webhooks.constructEvent` and `webhooks.generateTestHeaderString` are
// pure-crypto helpers.
const realStripe = new Stripe("sk_test_dummy_for_tests", {
  apiVersion: "2025-02-24.acacia",
});

function signedRequest(
  payload: Record<string, unknown>,
  opts: { tamperSignature?: boolean } = {},
): { body: string; signature: string } {
  const body = JSON.stringify(payload);
  let signature = realStripe.webhooks.generateTestHeaderString({
    payload: body,
    secret: WHSEC,
  });
  if (opts.tamperSignature) {
    signature = signature.replace(/,v1=[a-f0-9]+/, ",v1=deadbeef");
  }
  return { body, signature };
}

function paymentIntentSucceededEvent(
  intent: Partial<Stripe.PaymentIntent> & { id: string; metadata: Record<string, string> },
): Record<string, unknown> {
  return {
    id: "evt_test",
    object: "event",
    type: "payment_intent.succeeded",
    api_version: "2025-02-24.acacia",
    data: {
      object: {
        id: intent.id,
        object: "payment_intent",
        amount: 99900,
        currency: "usd",
        status: "succeeded",
        metadata: intent.metadata,
      },
    },
  };
}

function paymentIntentFailedEvent(
  intent: { id: string; metadata: Record<string, string>; errorMessage?: string },
): Record<string, unknown> {
  return {
    id: "evt_test_failed",
    object: "event",
    type: "payment_intent.payment_failed",
    api_version: "2025-02-24.acacia",
    data: {
      object: {
        id: intent.id,
        object: "payment_intent",
        amount: 99900,
        currency: "usd",
        status: "requires_payment_method",
        metadata: intent.metadata,
        last_payment_error: { message: intent.errorMessage ?? "card declined" },
      },
    },
  };
}

let actions: InMemoryActionStore;
let captured: BusEnvelope[];
let unsub: () => void;

beforeEach(() => {
  loadSeeds({ seedDir: SEED_DIR });
  const org = getOrg("org_acme");
  if (org) org.entitlements.compliancePack = false;

  actions = new InMemoryActionStore();
  setActionStore(actions);
  resetStripe();
  setStripeInstance(realStripe);

  captured = [];
  unsub = bus.subscribe("org_acme", (e) => captured.push(e));
  return () => {
    unsub();
  };
});

describe("POST /webhooks/stripe", () => {
  it("rejects unsigned requests with 400", async () => {
    const resp = await buildApp().request("/webhooks/stripe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(resp.status).toBe(400);
  });

  it("rejects forged signatures with 400", async () => {
    const { body, signature } = signedRequest(
      paymentIntentSucceededEvent({ id: "pi_test", metadata: { orgId: "org_acme" } }),
      { tamperSignature: true },
    );
    const resp = await buildApp().request("/webhooks/stripe", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Stripe-Signature": signature },
      body,
    });
    expect(resp.status).toBe(400);
  });

  it("on payment_intent.succeeded: flips entitlement, persists Action(payment), emits SSE", async () => {
    const { body, signature } = signedRequest(
      paymentIntentSucceededEvent({
        id: "pi_success",
        metadata: { orgId: "org_acme", sku: "compliance-pack" },
      }),
    );

    const resp = await buildApp().request("/webhooks/stripe", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Stripe-Signature": signature },
      body,
    });
    expect(resp.status).toBe(200);
    const env = (await resp.json()) as { received: boolean };
    expect(env.received).toBe(true);

    // Entitlement flipped.
    expect(getOrg("org_acme")?.entitlements.compliancePack).toBe(true);

    // Action row persisted.
    expect(actions.actions).toHaveLength(1);
    expect(actions.actions[0]?.kind).toBe("payment");
    expect(actions.actions[0]?.status).toBe("delivered");
    expect(actions.actions[0]?.externalId).toBe("pi_success");

    // SSE emitted.
    const events = captured.map((e) => e.payload.event);
    expect(events).toContain("org.entitlements.changed");
  });

  it("on payment_intent.payment_failed: writes failed Action, leaves entitlement alone, no SSE", async () => {
    const { body, signature } = signedRequest(
      paymentIntentFailedEvent({
        id: "pi_failure",
        metadata: { orgId: "org_acme" },
        errorMessage: "Your card was declined.",
      }),
    );
    const resp = await buildApp().request("/webhooks/stripe", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Stripe-Signature": signature },
      body,
    });
    expect(resp.status).toBe(200);
    expect(getOrg("org_acme")?.entitlements.compliancePack).toBe(false);
    expect(actions.actions).toHaveLength(1);
    expect(actions.actions[0]?.status).toBe("failed");
    expect(actions.actions[0]?.error).toBe("Your card was declined.");
    expect(captured.map((e) => e.payload.event)).not.toContain(
      "org.entitlements.changed",
    );
  });

  it("acks unknown event types with 200 (no entitlement change, no action)", async () => {
    const { body, signature } = signedRequest({
      id: "evt_unknown",
      object: "event",
      type: "charge.refunded",
      api_version: "2025-02-24.acacia",
      data: { object: { id: "ch_test" } },
    });
    const resp = await buildApp().request("/webhooks/stripe", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Stripe-Signature": signature },
      body,
    });
    expect(resp.status).toBe(200);
    expect(actions.actions).toHaveLength(0);
    expect(getOrg("org_acme")?.entitlements.compliancePack).toBe(false);
  });
});
