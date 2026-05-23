import Stripe from "stripe";
import { env } from "../env.js";

// Handoff/Decisions §09 locks: one product, one price, one PaymentIntent,
// one webhook. We mirror that here exactly — no subscriptions, no extra SKUs.

export const COMPLIANCE_PACK = {
  id: "compliance-pack",
  name: "Compliance Pack",
  description: "Evidence Bundles · Auditor portal · Vanta/Drata push",
  amountUsdCents: 99_900,
  currency: "usd",
} as const;

let cached: Stripe | undefined;

export function stripe(): Stripe {
  if (cached) return cached;
  const e = env();
  if (!e.STRIPE_SECRET_KEY) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set — billing/webhook routes require it",
    );
  }
  cached = new Stripe(e.STRIPE_SECRET_KEY, {
    // Pin a known-good API version so behavior is reproducible.
    apiVersion: "2025-02-24.acacia",
    typescript: true,
  });
  return cached;
}

// Stripe's account state — products live, the price for the pack, etc. We
// keep the productId and priceId in module memory so the billing route
// doesn't have to query Stripe on every call.
interface StripeState {
  productId: string;
  priceId: string;
}

let state: StripeState | undefined;

export function getStripeState(): StripeState | undefined {
  return state;
}

// Idempotent boot-time bootstrap. Creates the compliance-pack product and
// its price if either is missing. Safe to call repeatedly.
export async function ensureStripeProducts(): Promise<StripeState> {
  if (state) return state;
  const s = stripe();

  let product: Stripe.Product;
  try {
    product = await s.products.retrieve(COMPLIANCE_PACK.id);
  } catch (err) {
    if (err instanceof Stripe.errors.StripeError && err.code === "resource_missing") {
      product = await s.products.create({
        id: COMPLIANCE_PACK.id,
        name: COMPLIANCE_PACK.name,
        description: COMPLIANCE_PACK.description,
        metadata: { tier: "addon" },
      });
    } else {
      throw err;
    }
  }

  // Find or create the $999 one-time price.
  const prices = await s.prices.list({ product: product.id, active: true, limit: 100 });
  const existing = prices.data.find(
    (p) =>
      p.unit_amount === COMPLIANCE_PACK.amountUsdCents &&
      p.currency === COMPLIANCE_PACK.currency &&
      p.type === "one_time",
  );
  const price =
    existing ??
    (await s.prices.create({
      product: product.id,
      unit_amount: COMPLIANCE_PACK.amountUsdCents,
      currency: COMPLIANCE_PACK.currency,
    }));

  state = { productId: product.id, priceId: price.id };
  return state;
}

// Test/dev seam: lets tests pre-seed state without contacting Stripe.
export function setStripeState(next: StripeState): void {
  state = next;
}

export function resetStripe(): void {
  cached = undefined;
  state = undefined;
}

// Test seam: lets tests inject a fake SDK without contacting Stripe.
export function setStripeInstance(fake: Stripe): void {
  cached = fake;
}
