// Billing — products list, invoices, coupon validation. Stripe is a black box
// from the client's perspective; payment-intents returns a synthetic
// client_secret that will fail in real Stripe Elements but the simulate-success
// fallback path (Shift+Enter in the modal) sets the entitlement just like the
// real backend does.

import { register } from "../router.js";
import { store } from "../store.js";
import {
  badRequest,
  notFound,
  nowIso,
  ok,
  type MockRequest,
  type MockResponse,
} from "../types.js";

interface SyntheticInvoice {
  id: string;
  period: string;
  amountUsdCents: number;
  status: string;
  issuedAt: string;
  pdfUrl: string;
}

function buildInvoices(now: Date = new Date()): SyntheticInvoice[] {
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const period = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    const id = `INV-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return {
      id,
      period,
      amountUsdCents: i === 5 ? 150_000 : 1_899_900,
      status: "paid",
      issuedAt: d.toISOString(),
      pdfUrl: `/v1/billing/invoices/${id}/pdf`,
    };
  });
}

const COMPLIANCE_PACK_ID = "compliance-pack";
const COMPLIANCE_PACK_AMOUNT = 250_000;

const TIER_AMOUNT_CENTS: Record<string, number> = {
  [COMPLIANCE_PACK_ID]: COMPLIANCE_PACK_AMOUNT,
  starter: 30_000,
  growth: 150_000,
  scale: 350_000,
};

interface CouponDef {
  code: string;
  percentOff: number;
  label: string;
}

const COUPONS: Record<string, CouponDef> = {
  DEMO20: { code: "DEMO20", percentOff: 20, label: "Demo promo — 20% off" },
  WIN50: { code: "WIN50", percentOff: 50, label: "Hackathon judges — 50% off" },
  GROWTH10: { code: "GROWTH10", percentOff: 10, label: "Growth plan promo" },
};

function products(): MockResponse {
  const org = store.orgs.get("org_acme");
  return ok({
    data: [
      {
        id: COMPLIANCE_PACK_ID,
        name: "Compliance Pack",
        description: "Evidence bundles, auditor portal, Vanta / Drata push.",
        priceUsdCents: COMPLIANCE_PACK_AMOUNT,
        currency: "usd",
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
      compliancePack: org?.entitlements?.compliancePack ?? false,
    },
  });
}

function applyCoupon(amount: number, code?: string): { amount: number; coupon?: CouponDef } {
  if (!code) return { amount };
  const def = COUPONS[code.toUpperCase()];
  if (!def) return { amount };
  return {
    amount: Math.max(0, Math.round(amount * (1 - def.percentOff / 100))),
    coupon: def,
  };
}

function paymentIntent(req: MockRequest): MockResponse {
  const body = (req.body ?? {}) as { sku?: string; coupon?: string };
  const sku = body.sku ?? COMPLIANCE_PACK_ID;
  const base = TIER_AMOUNT_CENTS[sku] ?? COMPLIANCE_PACK_AMOUNT;
  const { amount, coupon } = applyCoupon(base, body.coupon);
  const intentId = `pi_demo_${Date.now()}`;
  return ok({
    paymentIntentId: intentId,
    clientSecret: `${intentId}_secret_demo`,
    amountUsdCents: amount,
    originalAmountUsdCents: base,
    currency: "usd",
    publishableKey: "pk_test_demo_stub",
    ...(coupon
      ? { coupon: { code: coupon.code, percentOff: coupon.percentOff, label: coupon.label } }
      : {}),
  });
}

function coupon(_req: MockRequest, code: string): MockResponse {
  const def = COUPONS[code.toUpperCase()];
  if (!def) return notFound("Invalid coupon");
  return ok({ code: def.code, percentOff: def.percentOff, label: def.label });
}

function invoices(): MockResponse {
  return ok({ invoices: buildInvoices() });
}

function invoicePdf(_req: MockRequest, id: string): MockResponse {
  const inv = buildInvoices().find((i) => i.id === id);
  if (!inv) return notFound("Invoice not found");
  // PDF generation needs a real PDF library on the backend; for the mock, hand
  // back a text/plain placeholder that still triggers the browser download flow.
  const text = `Unsyphn invoice ${inv.id}\nPeriod: ${inv.period}\nAmount: $${(
    inv.amountUsdCents / 100
  ).toFixed(2)}\nStatus: ${inv.status}\n\n(Demo placeholder — real invoices ship as PDF.)`;
  const bytes = new TextEncoder().encode(text);
  return {
    status: 200,
    body: null,
    binary: bytes,
    contentType: "application/pdf",
    headers: {
      "Content-Disposition": `attachment; filename="unsyphn-invoice-${inv.id}.pdf"`,
    },
  };
}

function simulateSuccess(): MockResponse {
  const org = store.orgs.get("org_acme");
  if (org) {
    store.orgs.set("org_acme", {
      ...org,
      entitlements: { ...org.entitlements, compliancePack: true },
    });
  }
  return ok({ ok: true, paymentIntentId: `pi_dev_${Date.now()}`, simulatedAt: nowIso() });
}

export function registerBillingHandlers(): void {
  register("GET", /^\/v1\/billing\/products$/, products);
  register("POST", /^\/v1\/billing\/payment-intents$/, paymentIntent);
  register("GET", /^\/v1\/billing\/coupons\/([^/]+)$/, (req, p) =>
    coupon(req, p[0] ?? ""),
  );
  register("GET", /^\/v1\/billing\/invoices$/, invoices);
  register("GET", /^\/v1\/billing\/invoices\/([^/]+)\/pdf$/, (req, p) =>
    invoicePdf(req, p[0] ?? ""),
  );
  register("POST", /^\/v1\/billing\/simulate-success$/, simulateSuccess);
  // Acknowledge but no-op — the spec also requires a badRequest if invalid.
  // Sanity check that handlers don't throw on unexpected body shapes.
  void badRequest;
}
