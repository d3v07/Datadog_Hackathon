import { describe, it, expect, beforeEach, vi } from "vitest";
import { resolve } from "node:path";
import { buildApp } from "../../apps/api/src/server.js";
import { loadSeeds, getOrg } from "../../apps/api/src/seed/loader.js";
import {
  setStripeInstance,
  setStripeState,
  resetStripe,
  COMPLIANCE_PACK,
} from "../../apps/api/src/providers/stripe.js";

const BEARER = "Bearer demo_token_acme_corp_2026";
const SEED_DIR = resolve(__dirname, "../../seed");

function buildFakeStripe(opts: {
  paymentIntentResult?: { id: string; client_secret: string };
  throwOnPaymentIntent?: Error;
} = {}) {
  return {
    paymentIntents: {
      create: vi.fn(async () => {
        if (opts.throwOnPaymentIntent) throw opts.throwOnPaymentIntent;
        return (
          opts.paymentIntentResult ?? {
            id: "pi_test_123",
            client_secret: "pi_test_123_secret_abc",
          }
        );
      }),
    },
    // Stubbed but unused in these tests because state is pre-seeded.
    products: { retrieve: vi.fn(), create: vi.fn() },
    prices: { list: vi.fn(), create: vi.fn() },
  } as unknown as import("stripe").default;
}

beforeEach(() => {
  loadSeeds({ seedDir: SEED_DIR });
  // Ensure org starts without entitlement.
  const org = getOrg("org_acme");
  if (org) org.entitlements.compliancePack = false;
  resetStripe();
  setStripeState({ productId: "compliance-pack", priceId: "price_test_seeded" });
});

describe("GET /v1/billing/products", () => {
  it("returns the Compliance Pack with the org's current entitlement", async () => {
    setStripeInstance(buildFakeStripe());
    const resp = await buildApp().request("/v1/billing/products", {
      headers: { Authorization: BEARER },
    });
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as {
      data: Array<{ id: string; priceUsdCents: number; billing: string; features: string[] }>;
      orgEntitlements: { compliancePack: boolean };
    };
    expect(body.data).toHaveLength(1);
    expect(body.data[0]?.id).toBe("compliance-pack");
    expect(body.data[0]?.priceUsdCents).toBe(99_900);
    expect(body.data[0]?.billing).toBe("one-time");
    expect(body.data[0]?.features.length).toBeGreaterThan(0);
    expect(body.orgEntitlements.compliancePack).toBe(false);
  });

  it("reflects a flipped entitlement", async () => {
    const org = getOrg("org_acme");
    if (org) org.entitlements.compliancePack = true;
    setStripeInstance(buildFakeStripe());
    const resp = await buildApp().request("/v1/billing/products", {
      headers: { Authorization: BEARER },
    });
    const body = (await resp.json()) as { orgEntitlements: { compliancePack: boolean } };
    expect(body.orgEntitlements.compliancePack).toBe(true);
  });
});

describe("POST /v1/billing/payment-intents", () => {
  it("creates a PaymentIntent and returns clientSecret + publishableKey", async () => {
    setStripeInstance(buildFakeStripe());
    const resp = await buildApp().request("/v1/billing/payment-intents", {
      method: "POST",
      headers: { Authorization: BEARER, "Content-Type": "application/json" },
      body: JSON.stringify({ sku: COMPLIANCE_PACK.id }),
    });
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as {
      paymentIntentId: string;
      clientSecret: string;
      publishableKey: string;
      amountUsdCents: number;
    };
    expect(body.paymentIntentId).toBe("pi_test_123");
    expect(body.clientSecret).toBe("pi_test_123_secret_abc");
    expect(body.amountUsdCents).toBe(99_900);
    expect(body.publishableKey).toMatch(/^pk_/);
  });

  it("returns 409 when the org already has the entitlement", async () => {
    const org = getOrg("org_acme");
    if (org) org.entitlements.compliancePack = true;
    setStripeInstance(buildFakeStripe());
    const resp = await buildApp().request("/v1/billing/payment-intents", {
      method: "POST",
      headers: { Authorization: BEARER, "Content-Type": "application/json" },
      body: JSON.stringify({ sku: COMPLIANCE_PACK.id }),
    });
    expect(resp.status).toBe(409);
    const body = (await resp.json()) as { error: { code: string } };
    expect(body.error.code).toBe("conflict");
  });

  it("returns 400 when the sku is wrong", async () => {
    setStripeInstance(buildFakeStripe());
    const resp = await buildApp().request("/v1/billing/payment-intents", {
      method: "POST",
      headers: { Authorization: BEARER, "Content-Type": "application/json" },
      body: JSON.stringify({ sku: "platinum-pack" }),
    });
    expect(resp.status).toBe(400);
    const body = (await resp.json()) as { error: { code: string } };
    expect(body.error.code).toBe("validation-failed");
  });

  it("returns 502 when Stripe errors", async () => {
    setStripeInstance(
      buildFakeStripe({ throwOnPaymentIntent: new Error("network down") }),
    );
    const resp = await buildApp().request("/v1/billing/payment-intents", {
      method: "POST",
      headers: { Authorization: BEARER, "Content-Type": "application/json" },
      body: JSON.stringify({ sku: COMPLIANCE_PACK.id }),
    });
    expect(resp.status).toBe(502);
    const body = (await resp.json()) as { error: { code: string } };
    expect(body.error.code).toBe("upstream-failed");
  });
});
