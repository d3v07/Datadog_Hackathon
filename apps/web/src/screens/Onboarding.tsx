import { useState } from "react";
import { StripeModal } from "./StripeModal.js";

// Replaces VendorOnboarding.tsx — 4-tier pricing grid per plan.md §3 step 5
// and PDF §10. Only Compliance Pack opens a real StripeModal; others show the
// modal pointing at the compliance pack product (only SKU available).

interface TierDef {
  id: string;
  name: string;
  price: string;
  priceNote: string;
  vendorRange: string;
  flows: string;
  integrations: string;
  extras: readonly string[];
  cta: string;
  ctaKind: "stripe" | "email" | "stripe-addon";
  recommended?: true;
}

const TIERS: readonly TierDef[] = [
  {
    id: "team",
    name: "Team",
    price: "$499",
    priceNote: "/mo",
    vendorRange: "10–50 vendors",
    flows: "Flows 1, 2, 3, 10",
    integrations: "Slack + email",
    extras: [],
    cta: "Select",
    ctaKind: "stripe",
  },
  {
    id: "business",
    name: "Business",
    price: "$1,999",
    priceNote: "/mo",
    vendorRange: "50–250 vendors",
    flows: "Flows 4, 5, 6, 8",
    integrations: "Jira + calendar",
    extras: ["Policy Studio"],
    cta: "Select",
    ctaKind: "stripe",
    recommended: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    priceNote: "",
    vendorRange: "250+ vendors",
    flows: "All flows",
    integrations: "SSO + Data residency",
    extras: ["Dedicated CSM"],
    cta: "Talk to us",
    ctaKind: "email",
  },
  {
    id: "compliance",
    name: "Compliance Pack",
    price: "$999",
    priceNote: "/mo",
    vendorRange: "add-on",
    flows: "Evidence Bundles",
    integrations: "Auditor portal",
    extras: ["Vanta / Drata push"],
    cta: "Add",
    ctaKind: "stripe-addon",
  },
] as const;

// Inline token-based styles — avoids adding new CSS file for a single screen.
const S = {
  page: {
    padding: "var(--space-8) var(--space-5)",
    maxWidth: 1160,
    margin: "0 auto",
  },
  heading: {
    fontFamily: "var(--font-display)",
    fontSize: "var(--text-3xl)",
    fontWeight: 200,
    letterSpacing: "-0.035em",
    color: "var(--text-strong)",
    margin: "0 0 var(--space-3)",
  },
  subheading: {
    fontSize: "var(--text-base)",
    fontWeight: 300,
    color: "var(--text-2)",
    margin: "0 0 var(--space-7)",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 320px))",
    gap: "var(--space-5)",
    justifyContent: "center",
  },
  card: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)",
    padding: "var(--space-6)",
    display: "flex",
    flexDirection: "column" as const,
    gap: "var(--space-3)",
    position: "relative" as const,
    transition: "border-color var(--dur-base) var(--ease-out)",
  },
  cardAccent: {
    border: "1px solid var(--accent)",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    height: 20,
    padding: "0 8px",
    background: "var(--accent-soft)",
    color: "var(--accent)",
    borderRadius: "var(--radius-full)",
    fontSize: "var(--text-xs)",
    fontWeight: 400,
    letterSpacing: "0.04em",
    textTransform: "uppercase" as const,
    width: "fit-content",
  },
  tierName: {
    fontFamily: "var(--font-display)",
    fontSize: "var(--text-lg)",
    fontWeight: 300,
    color: "var(--text-strong)",
    margin: 0,
  },
  price: {
    fontFamily: "var(--font-display)",
    fontSize: "var(--text-2xl)",
    fontWeight: 200,
    letterSpacing: "-0.03em",
    color: "var(--text-strong)",
    margin: 0,
  },
  priceNote: {
    fontSize: "var(--text-sm)",
    color: "var(--muted)",
    fontWeight: 300,
    marginLeft: "2px",
  },
  featureList: {
    listStyle: "none",
    padding: 0,
    margin: "var(--space-2) 0 0",
    display: "flex",
    flexDirection: "column" as const,
    gap: "var(--space-2)",
    flex: 1,
  },
  featureItem: {
    fontSize: "var(--text-sm)",
    color: "var(--text-2)",
    paddingLeft: "var(--space-4)",
    position: "relative" as const,
    lineHeight: 1.5,
  },
  featureDot: {
    position: "absolute" as const,
    left: 0,
    color: "var(--success)",
    fontWeight: 700,
    fontSize: "var(--text-xs)",
    top: "1px",
  },
  btnPrimary: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    height: 36,
    padding: "0 var(--space-4)",
    background: "var(--accent)",
    color: "var(--bg)",
    border: "1px solid var(--accent)",
    borderRadius: "var(--radius-md)",
    fontFamily: "var(--font-text)",
    fontSize: "var(--text-sm)",
    fontWeight: 400,
    cursor: "pointer",
    width: "100%",
    marginTop: "var(--space-2)",
    textDecoration: "none",
    transition: "background var(--dur-fast) var(--ease-out)",
  },
  btnSecondary: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    height: 36,
    padding: "0 var(--space-4)",
    background: "var(--surface-2)",
    color: "var(--text)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-md)",
    fontFamily: "var(--font-text)",
    fontSize: "var(--text-sm)",
    fontWeight: 400,
    cursor: "pointer",
    width: "100%",
    marginTop: "var(--space-2)",
    textDecoration: "none",
    transition: "background var(--dur-fast) var(--ease-out)",
  },
  divider: {
    border: "none",
    borderTop: "1px solid var(--hairline)",
    margin: "var(--space-2) 0",
  },
} as const;

export function Onboarding(): JSX.Element {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div style={S.page}>
      <h1 style={S.heading}>Choose your plan</h1>
      <p style={S.subheading}>
        All plans include vendor change detection, policy firing, and evidence briefs.
      </p>

      <div style={S.grid} role="list">
        {TIERS.map((tier) => (
          <TierCard
            key={tier.id}
            tier={tier}
            onOpenModal={() => setModalOpen(true)}
          />
        ))}
      </div>

      {modalOpen && <StripeModal onClose={() => setModalOpen(false)} />}
    </div>
  );
}

interface TierCardProps {
  tier: TierDef;
  onOpenModal: () => void;
}

function TierCard({ tier, onOpenModal }: TierCardProps): JSX.Element {
  const cardStyle = tier.recommended
    ? { ...S.card, ...S.cardAccent }
    : S.card;

  const features: string[] = [
    tier.vendorRange,
    tier.flows,
    tier.integrations,
    ...tier.extras,
  ];

  return (
    <div style={cardStyle} role="listitem">
      {tier.recommended && (
        <span style={S.badge} aria-label="Recommended plan">
          Recommended
        </span>
      )}

      <div>
        <h2 style={S.tierName}>{tier.name}</h2>
        <p style={S.price}>
          {tier.price}
          {tier.priceNote && (
            <span style={S.priceNote}>{tier.priceNote}</span>
          )}
        </p>
      </div>

      <hr style={S.divider} />

      <ul style={S.featureList} aria-label={`${tier.name} features`}>
        {features.map((f) => (
          <li key={f} style={S.featureItem}>
            <span style={S.featureDot} aria-hidden="true">·</span>
            {f}
          </li>
        ))}
      </ul>

      {tier.ctaKind === "email" ? (
        <a
          href="mailto:enterprise@redline.com"
          style={S.btnSecondary}
          aria-label={`${tier.cta} — contact sales for Enterprise`}
        >
          {tier.cta}
        </a>
      ) : (
        <button
          type="button"
          style={tier.ctaKind === "stripe-addon" ? S.btnSecondary : S.btnPrimary}
          onClick={onOpenModal}
          aria-label={`${tier.cta} — ${tier.name} plan`}
        >
          {tier.cta}
        </button>
      )}
    </div>
  );
}
