import { Check } from "lucide-react";
import { TIERS, tierDisplay, type BillingCadence, type TierDef } from "./tiers.js";

interface PricingTiersProps {
  cadence: BillingCadence;
  onSubscribe: (tier: TierDef) => void;
}

const S = {
  grid: {
    maxWidth: 1240,
    margin: "0 auto",
    padding: "0 var(--space-5) var(--space-7)",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "var(--space-3)",
    alignItems: "stretch",
  } as React.CSSProperties,
  card: {
    padding: "var(--space-5)",
    display: "flex",
    flexDirection: "column" as const,
    position: "relative" as const,
  },
  mono500: { fontFamily: "var(--font-mono)", fontWeight: 500 } as React.CSSProperties,
  sm: { fontSize: "var(--text-sm)", color: "var(--text-2)" } as React.CSSProperties,
} as const;

export function PricingTiers({ cadence, onSubscribe }: PricingTiersProps): JSX.Element {
  return (
    <section aria-label="Pricing tiers" style={S.grid} className="stagger-children">
      {TIERS.map((tier) => (
        <TierCard
          key={tier.id}
          tier={tier}
          cadence={cadence}
          onSubscribe={() => onSubscribe(tier)}
        />
      ))}
    </section>
  );
}

interface TierCardProps {
  tier: TierDef;
  cadence: BillingCadence;
  onSubscribe: () => void;
}

function TierCard({ tier, cadence, onSubscribe }: TierCardProps): JSX.Element {
  const { price, period } = tierDisplay(tier, cadence);

  function handleCta() {
    if (tier.ctaAction === "stripe") {
      onSubscribe();
      return;
    }
    if (tier.ctaAction === "enterprise" || tier.ctaAction === "custom-mailto") {
      window.location.href = `mailto:${tier.mailto}`;
      return;
    }
    window.location.href = "/app/onboarding";
  }

  return (
    <div
      className="card glass-strong lift-on-hover"
      style={{
        ...S.card,
        outline: tier.recommended ? "2px solid var(--accent)" : undefined,
      }}
    >
      {tier.recommended && (
        <span
          className="badge badge-accent"
          style={{ position: "absolute", top: "var(--space-4)", right: "var(--space-4)" }}
        >
          Recommended
        </span>
      )}
      <h3
        style={{
          fontFamily: "var(--font-text)",
          fontWeight: 600,
          fontSize: "var(--text-base)",
          color: "var(--text-strong)",
          margin: "0 0 var(--space-2)",
        }}
      >
        {tier.name}
      </h3>
      <div style={{ marginBottom: "var(--space-1)" }}>
        <span
          style={{
            ...S.mono500,
            fontWeight: 700,
            fontSize: "var(--text-2xl)",
            color: "var(--text-strong)",
            letterSpacing: "-0.02em",
          }}
        >
          {price}
        </span>
        {period && (
          <span
            style={{
              fontSize: "var(--text-sm)",
              color: "var(--text-muted)",
              marginLeft: "var(--space-1)",
            }}
          >
            {period}
          </span>
        )}
      </div>
      <p
        style={{
          fontSize: "var(--text-xs)",
          color: "var(--text-muted)",
          margin: "0 0 var(--space-4)",
          lineHeight: 1.4,
        }}
      >
        {tier.description}
      </p>
      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: "0 0 var(--space-5)",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-2)",
        }}
      >
        {tier.features.map((f) => (
          <li
            key={f}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "var(--space-2)",
              ...S.sm,
              lineHeight: 1.45,
              transition: "color var(--dur-sm) var(--ease-out)",
            }}
          >
            <Check
              size={14}
              aria-hidden="true"
              style={{ color: "var(--success)", flexShrink: 0, marginTop: 2 }}
            />
            {f}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={handleCta}
        className={
          (tier.ctaVariant === "primary" ? "btn btn-primary" : "btn btn-secondary") +
          " button-pop"
        }
        style={{ width: "100%", justifyContent: "center" }}
        data-tier={tier.id}
      >
        {tier.cta}
      </button>
    </div>
  );
}
