// Phase 8 — coupon registry. Demo-only; production would back this with a
// per-tenant table and Stripe Coupon objects. The known codes here are
// flat-rate percent-off or "first month free" (treated as 100% off for the
// one-time PaymentIntent flow used by the modal).

export interface Coupon {
  code: string;
  /** Percent discount applied to amountUsdCents. 25 means 25% off. */
  percentOff: number;
  label: string;
}

const COUPONS: ReadonlyArray<Coupon> = [
  { code: "HACKATHON25", percentOff: 25, label: "25% off" },
  { code: "FOUNDER50", percentOff: 50, label: "50% off" },
  { code: "LAUNCH", percentOff: 100, label: "First month free" },
] as const;

export function findCoupon(code: string | undefined): Coupon | undefined {
  if (!code) return undefined;
  const upper = code.trim().toUpperCase();
  return COUPONS.find((c) => c.code === upper);
}

export function applyCoupon(
  amountUsdCents: number,
  code: string | undefined,
): { amount: number; coupon?: Coupon } {
  const coupon = findCoupon(code);
  if (!coupon) return { amount: amountUsdCents };
  // Round to nearest cent — Stripe rejects fractional cents.
  const discounted = Math.max(
    0,
    Math.round(amountUsdCents * (1 - coupon.percentOff / 100)),
  );
  return { amount: discounted, coupon };
}
