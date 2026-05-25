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

  it("applies a known coupon and discounts the charged amount", async () => {
    const fake = buildFakeStripe();
    setStripeInstance(fake);
    const resp = await buildApp().request("/v1/billing/payment-intents", {
      method: "POST",
      headers: { Authorization: BEARER, "Content-Type": "application/json" },
      body: JSON.stringify({ sku: "growth", coupon: "FOUNDER50" }),
    });
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as {
      amountUsdCents: number;
      originalAmountUsdCents: number;
      coupon: { code: string; percentOff: number };
    };
    expect(body.originalAmountUsdCents).toBe(150_000);
    expect(body.amountUsdCents).toBe(75_000);
    expect(body.coupon.code).toBe("FOUNDER50");
    expect(body.coupon.percentOff).toBe(50);
  });

  it("ignores an unknown coupon (no discount, no error)", async () => {
    setStripeInstance(buildFakeStripe());
    const resp = await buildApp().request("/v1/billing/payment-intents", {
      method: "POST",
      headers: { Authorization: BEARER, "Content-Type": "application/json" },
      body: JSON.stringify({ sku: "starter", coupon: "NOPE" }),
    });
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as {
      amountUsdCents: number;
      coupon?: unknown;
    };
    expect(body.amountUsdCents).toBe(30_000);
    expect(body.coupon).toBeUndefined();
  });

  it("accepts the new tier SKUs (starter/growth/scale)", async () => {
    setStripeInstance(buildFakeStripe());
    for (const sku of ["starter", "growth", "scale"]) {
      const resp = await buildApp().request("/v1/billing/payment-intents", {
        method: "POST",
        headers: { Authorization: BEARER, "Content-Type": "application/json" },
        body: JSON.stringify({ sku }),
      });
      expect(resp.status).toBe(200);
    }
  });
});

describe("GET /v1/billing/coupons/:code", () => {
  it("returns the coupon for a known code", async () => {
    const resp = await buildApp().request("/v1/billing/coupons/HACKATHON25", {
      headers: { Authorization: BEARER },
    });
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as { code: string; percentOff: number };
    expect(body.code).toBe("HACKATHON25");
    expect(body.percentOff).toBe(25);
  });

  it("returns 404 for an unknown coupon", async () => {
    const resp = await buildApp().request("/v1/billing/coupons/NOPE", {
      headers: { Authorization: BEARER },
    });
    expect(resp.status).toBe(404);
  });
});

describe("GET /v1/billing/invoices", () => {
  it("returns a list of synthetic invoices", async () => {
    const resp = await buildApp().request("/v1/billing/invoices", {
      headers: { Authorization: BEARER },
    });
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as {
      invoices: Array<{ id: string; amountUsdCents: number; status: string }>;
    };
    expect(body.invoices.length).toBeGreaterThan(0);
    for (const inv of body.invoices) {
      expect(inv.id).toMatch(/^INV-/);
      expect(inv.status).toBe("paid");
      expect(inv.amountUsdCents).toBeGreaterThan(0);
    }
  });
});

describe("GET /v1/billing/invoices/:id/pdf", () => {
  it("returns a real PDF with the right headers", async () => {
    const app = buildApp();
    const list = (await (
      await app.request("/v1/billing/invoices", {
        headers: { Authorization: BEARER },
      })
    ).json()) as { invoices: Array<{ id: string }> };
    const firstId = list.invoices[0]?.id;
    expect(firstId).toBeDefined();

    const resp = await app.request(`/v1/billing/invoices/${firstId}/pdf`, {
      headers: { Authorization: BEARER },
    });
    expect(resp.status).toBe(200);
    expect(resp.headers.get("content-type")).toBe("application/pdf");
    expect(resp.headers.get("content-disposition")).toContain(
      'filename="unsyphn-invoice-',
    );
    expect(resp.headers.get("content-disposition")).toContain(`${firstId}.pdf"`);
    const contentLength = Number(resp.headers.get("content-length"));
    expect(contentLength).toBeGreaterThan(0);

    const ab = await resp.arrayBuffer();
    const bytes = new Uint8Array(ab);
    expect(bytes.byteLength).toBe(contentLength);
    expect(bytes.byteLength).toBeGreaterThan(500);
    // PDF magic header: "%PDF-1." (0x25 0x50 0x44 0x46 0x2D 0x31 0x2E)
    const head = new TextDecoder().decode(bytes.slice(0, 7));
    expect(head).toBe("%PDF-1.");
  });

  it("returns 404 for an unknown invoice id", async () => {
    const resp = await buildApp().request(
      "/v1/billing/invoices/INV-9999-13/pdf",
      { headers: { Authorization: BEARER } },
    );
    expect(resp.status).toBe(404);
    const body = (await resp.json()) as { error: { code: string } };
    expect(body.error.code).toBe("not-found");
  });
});
