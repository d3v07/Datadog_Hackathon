// Phase 8 — tier registry shared between PricingTiers, PricingMatrix, and the
// StripeModal launch logic. SKUs match the backend enum in
// apps/api/src/routes/billing.ts.

export type TierId = "discover" | "starter" | "growth" | "scale" | "enterprise" | "custom";
export type CtaAction = "onboarding" | "stripe" | "enterprise" | "custom-mailto";
export type CtaVariant = "primary" | "secondary";

export interface TierDef {
  id: TierId;
  name: string;
  /** Monthly price in USD cents. 0 for free / not-applicable. */
  monthlyCents: number;
  /** Some tiers (Enterprise, Custom) don't follow the monthly/annual model. */
  customPriceLabel?: string;
  /** Sub-label shown next to the price. */
  unitLabel: string;
  description: string;
  features: ReadonlyArray<string>;
  cta: string;
  ctaVariant: CtaVariant;
  ctaAction: CtaAction;
  recommended: boolean;
  /** SKU sent to /v1/billing/payment-intents. */
  sku?: string;
  /** mailto link for enterprise/custom CTAs. */
  mailto?: string;
}

export const TIERS: ReadonlyArray<TierDef> = [
  {
    id: "discover",
    name: "Discover",
    monthlyCents: 0,
    unitLabel: "free forever",
    description: "PLG funnel, pre-qualification",
    features: [
      "Single Google / M365 connection",
      "Email-metadata + OAuth-grant discovery",
      "Top-100 vendor cards with benchmark hints",
      "5 contract uploads",
      "Slack alerts",
      "Audit log",
      "\"Powered by Unsyphn\" footer on shared reports",
    ],
    cta: "Start free",
    ctaVariant: "secondary",
    ctaAction: "onboarding",
    recommended: false,
  },
  {
    id: "starter",
    name: "Starter",
    monthlyCents: 30_000,
    unitLabel: "/mo",
    description: "1–15 employees",
    features: [
      "1 connector",
      "50 vendor cards",
      "Weekly digest",
      "Slack alerts",
      "1 user seat",
      "Email support",
    ],
    cta: "Subscribe",
    ctaVariant: "secondary",
    ctaAction: "stripe",
    sku: "starter",
    recommended: false,
  },
  {
    id: "growth",
    name: "Growth",
    monthlyCents: 150_000,
    unitLabel: "/mo",
    description: "50–250 employees",
    features: [
      "Material Change Feed",
      "Unlimited contracts",
      "Renegotiation packets",
      "Jira + Slack routing",
      "3 integrations",
      "Audit log",
      "Remove branding",
    ],
    cta: "Subscribe",
    ctaVariant: "secondary",
    ctaAction: "stripe",
    sku: "growth",
    recommended: false,
  },
  {
    id: "scale",
    name: "Scale",
    monthlyCents: 350_000,
    unitLabel: "/mo",
    description: "250–1,000 employees",
    features: [
      "Sub-processor heatmap",
      "Customer Commitments extraction",
      "Unlimited integrations",
      "RBAC + SCIM",
      "1 dedicated CSM hour/week",
      "Custom SSO on all paid tiers",
      "Priority support",
    ],
    cta: "Subscribe — most popular",
    ctaVariant: "primary",
    ctaAction: "stripe",
    sku: "scale",
    recommended: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    monthlyCents: 0,
    customPriceLabel: "$30K",
    unitLabel: "+ 15% of net savings",
    description: "1,000+ employees · savings capped at $200K/yr",
    features: [
      "Data residency (US / EU pinning)",
      "Custom SSO + dedicated negotiation analyst",
      "On-prem SIEM webhook",
      "Audit-mode workspaces",
      "Private API",
      "99.9% SLA",
      "Dedicated analyst",
    ],
    cta: "Talk to us",
    ctaVariant: "secondary",
    ctaAction: "enterprise",
    mailto: "enterprise@unsyphn.com",
    recommended: false,
  },
  {
    id: "custom",
    name: "Custom",
    monthlyCents: 0,
    customPriceLabel: "Contact sales",
    unitLabel: "",
    description: "5,000+ employees · multi-region · white-glove",
    features: [
      "Data residency in any region",
      "Dedicated negotiation team",
      "White-glove onboarding",
      "Custom SLA & DPAs",
      "Private cloud / on-prem deploy",
      "Multi-org consolidation",
      "Executive QBRs",
    ],
    cta: "Contact sales",
    ctaVariant: "secondary",
    ctaAction: "custom-mailto",
    mailto: "custom@unsyphn.com?subject=Custom%20plan%20enquiry",
    recommended: false,
  },
] as const;

export type BillingCadence = "monthly" | "annual";

/** Display price for a tier given monthly/annual toggle.
 *  Annual = monthly * 0.8 (20% off) shown as "$X/mo billed annually". */
export function tierDisplay(
  tier: TierDef,
  cadence: BillingCadence,
): { price: string; period: string } {
  if (tier.customPriceLabel) {
    return { price: tier.customPriceLabel, period: tier.unitLabel };
  }
  if (tier.monthlyCents === 0) {
    return { price: "$0", period: tier.unitLabel };
  }
  if (cadence === "annual") {
    const monthlyEquiv = Math.round(tier.monthlyCents * 0.8);
    return {
      price: "$" + (monthlyEquiv / 100).toLocaleString("en-US"),
      period: "/mo billed annually",
    };
  }
  return {
    price: "$" + (tier.monthlyCents / 100).toLocaleString("en-US"),
    period: tier.unitLabel,
  };
}

/** Effective monthly cents the user is subscribed at for the given cadence. */
export function effectiveCents(tier: TierDef, cadence: BillingCadence): number {
  if (tier.monthlyCents === 0) return 0;
  return cadence === "annual"
    ? Math.round(tier.monthlyCents * 0.8)
    : tier.monthlyCents;
}
