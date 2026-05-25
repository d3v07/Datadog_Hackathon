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
import { applyCoupon } from "../lib/coupons.js";
import { generateInvoicePdf, type InvoiceForPdf } from "../lib/invoice-pdf.js";

export const billingRoute = new Hono();

export interface SyntheticInvoice {
  id: string;
  period: string;
  amountUsdCents: number;
  status: string;
  issuedAt: string;
  pdfUrl: string;
  plan: string;
  paymentIntentId: string;
  paidAt: string;
}

// Synthetic invoice history. Deterministic per (orgId, current month) so the
// list endpoint and the by-id lookup agree within a request. A real
// implementation would page through Stripe invoices for the org's customer id.
function buildInvoices(orgId: string, now: Date = new Date()): SyntheticInvoice[] {
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const period = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    const id = `INV-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const paidAt = new Date(d.getFullYear(), d.getMonth(), 3).toISOString();
    return {
      id,
      period,
      amountUsdCents: i === 5 ? 150_000 : 1_899_900,
      status: "paid",
      issuedAt: d.toISOString(),
      pdfUrl: `/v1/billing/invoices/${id}/pdf`,
      plan: i === 5 ? "Growth" : "Scale",
      paymentIntentId: `pi_demo_${orgId}_${id}`,
      paidAt,
    };
  });
}

export function getInvoiceById(orgId: string, id: string): SyntheticInvoice | undefined {
  return buildInvoices(orgId).find((inv) => inv.id === id);
}

// Phase 8: in addition to the original Compliance Pack, the public Pricing
// page now subscribes to the tier SKUs. Prices below are the monthly billed
// amounts in USD cents; the modal client converts to annual on the front end.
const TIER_AMOUNT_CENTS: Record<string, number> = {
  [COMPLIANCE_PACK.id]: COMPLIANCE_PACK.amountUsdCents,
  starter: 30_000,
  growth: 150_000,
  scale: 350_000,
};

const PaymentIntentBodySchema = z.object({
  sku: z.enum([COMPLIANCE_PACK.id, "starter", "growth", "scale"]),
  coupon: z.string().trim().max(64).optional(),
  addOns: z.array(z.string().trim().max(64)).max(8).optional(),
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

  const { sku, coupon: couponCode, addOns } = parsed.data;
  // The Compliance Pack is a one-time entitlement-bearing purchase; reject if
  // already entitled. Tier subscriptions can be re-purchased.
  if (sku === COMPLIANCE_PACK.id && org.entitlements.compliancePack) {
    throw new ApiError(
      ErrorCodes.Conflict,
      "Org already has the Compliance Pack entitlement",
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

  const baseAmount = TIER_AMOUNT_CENTS[sku] ?? COMPLIANCE_PACK.amountUsdCents;
  const { amount: amountUsdCents, coupon } = applyCoupon(baseAmount, couponCode);

  try {
    const intent = await stripe().paymentIntents.create({
      amount: amountUsdCents,
      currency: COMPLIANCE_PACK.currency,
      automatic_payment_methods: { enabled: true },
      metadata: {
        orgId,
        sku,
        coupon: coupon?.code ?? "",
        addOns: addOns?.join(",") ?? "",
      },
    });
    return c.json({
      paymentIntentId: intent.id,
      clientSecret: intent.client_secret,
      amountUsdCents,
      originalAmountUsdCents: baseAmount,
      currency: COMPLIANCE_PACK.currency,
      publishableKey: e.STRIPE_PUBLISHABLE_KEY,
      coupon: coupon ? { code: coupon.code, percentOff: coupon.percentOff, label: coupon.label } : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "stripe error";
    throw new ApiError(ErrorCodes.UpstreamFailed, message, {
      provider: "stripe",
    });
  }
});

// Coupon validation endpoint — used by the modal to show "valid coupon"
// feedback without round-tripping a full payment intent.
billingRoute.get("/coupons/:code", (c) => {
  const code = c.req.param("code");
  const result = applyCoupon(100, code);
  if (!result.coupon) {
    throw new ApiError(ErrorCodes.NotFound, "Invalid coupon");
  }
  return c.json({
    code: result.coupon.code,
    percentOff: result.coupon.percentOff,
    label: result.coupon.label,
  });
});

billingRoute.get("/invoices", (c) => {
  const orgId = c.get("orgId");
  const invoices = buildInvoices(orgId).map(
    ({ plan: _plan, paymentIntentId: _pi, paidAt: _pa, ...rest }) => rest,
  );
  return c.json({ invoices });
});

billingRoute.get("/invoices/:id/pdf", async (c) => {
  const orgId = c.get("orgId");
  const org = getOrg(orgId);
  if (!org) throw new ApiError(ErrorCodes.NotFound, `Org ${orgId} not found`);

  const invoice = getInvoiceById(orgId, c.req.param("id"));
  if (!invoice) throw new ApiError(ErrorCodes.NotFound, "Invoice not found");

  const pdfPayload: InvoiceForPdf = {
    id: invoice.id,
    period: invoice.period,
    amountUsdCents: invoice.amountUsdCents,
    status: invoice.status,
    issuedAt: invoice.issuedAt,
    plan: invoice.plan,
    paymentIntentId: invoice.paymentIntentId,
    paidAt: invoice.paidAt,
  };
  const buffer = await generateInvoicePdf({
    invoice: pdfPayload,
    org: {
      name: org.name,
      ...(org.seatCount !== undefined ? { seatCount: org.seatCount } : {}),
      billingEmail: `billing@${org.name.toLowerCase().replace(/[^a-z0-9]+/g, "")}.example`,
    },
  });

  // Hono's c.body wants Uint8Array<ArrayBuffer>; Node Buffer is
  // Uint8Array<ArrayBufferLike>, so copy into a fresh ArrayBuffer-backed view.
  const body = new Uint8Array(buffer.byteLength);
  body.set(buffer);
  c.header("Content-Type", "application/pdf");
  c.header(
    "Content-Disposition",
    `attachment; filename="unsyphn-invoice-${invoice.id}.pdf"`,
  );
  c.header("Content-Length", String(body.byteLength));
  return c.body(body);
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
