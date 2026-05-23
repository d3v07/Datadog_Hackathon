import { useState } from "react";

type TierId = 1 | 2 | 3;

interface TierDef {
  id: TierId;
  sla: string;
  name: string;
  description: string;
  price: string;
  features: readonly string[];
  cta: string;
  recommended?: true;
}

const TIERS: readonly TierDef[] = [
  {
    id: 1,
    sla: "6H",
    name: "6-Hour Express",
    description: "For mission-critical vendors. Sub-six-hour detection on every change.",
    price: "$999",
    features: [
      "6-hour SLA on change detection",
      "Dedicated escalation channel",
      "Hourly diff scans 24/7",
      "Priority routing to on-call",
      "Compliance bundle included",
    ],
    cta: "Start 6H Express",
  },
  {
    id: 2,
    sla: "24H",
    name: "24-Hour Standard",
    description: "The right default for most vendors. Daily monitoring with automated alerts.",
    price: "$299",
    features: [
      "24-hour SLA on change detection",
      "Daily automated scans",
      "Slack + email routing",
      "Quarterly evidence bundles",
      "Standard support",
    ],
    cta: "Start 24H Standard",
    recommended: true,
  },
  {
    id: 3,
    sla: "48H",
    name: "48-Hour Basic",
    description: "Lightweight coverage for low-priority vendors. Routine checks, weekly digests.",
    price: "$99",
    features: [
      "48-hour SLA on change detection",
      "Bi-daily routine scans",
      "Weekly digest emails",
      "Self-serve evidence export",
      "Community support",
    ],
    cta: "Start 48H Basic",
  },
] as const;

export function VendorOnboarding(): JSX.Element {
  const [selectedTier, setSelectedTier] = useState<TierId | null>(null);

  return (
    <>
      <div className="card">
        <h1 className="card__title">Onboard a new vendor</h1>
        <p className="card__sub">
          Choose a monitoring SLA that matches your vendor's criticality. You can change
          this later from the vendor settings page.
        </p>
      </div>

      <div
        className="tier-grid"
        role="radiogroup"
        aria-label="Monitoring tier selection"
      >
        {TIERS.map((tier) => (
          <TierCard
            key={tier.id}
            tier={tier}
            selected={selectedTier === tier.id}
            onSelect={() => setSelectedTier(tier.id)}
          />
        ))}
      </div>
    </>
  );
}

interface TierCardProps {
  tier: TierDef;
  selected: boolean;
  onSelect: () => void;
}

function TierCard({ tier, selected, onSelect }: TierCardProps): JSX.Element {
  const cardClass = [
    "tier-card",
    tier.recommended ? "tier-card--recommended" : "",
    selected ? "tier-card--selected" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      onSelect();
    }
  };

  const handleCtaClick = (e: React.MouseEvent<HTMLButtonElement>): void => {
    e.stopPropagation();
    window.location.href = `/?tier=${tier.id}`;
  };

  return (
    <div
      className={cardClass}
      role="radio"
      aria-checked={selected}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
    >
      {tier.recommended && (
        <span className="tier-card__badge" aria-label="Recommended tier">
          Recommended
        </span>
      )}

      <span className="tier-card__sla">{tier.sla}</span>
      <h2 className="tier-card__name">{tier.name}</h2>
      <p className="tier-card__desc">{tier.description}</p>

      <div className="tier-card__price">
        <span className="tier-card__price-amount">{tier.price}</span>
        <span className="tier-card__price-unit">/month</span>
      </div>

      <ul className="tier-card__features" aria-label="Included features">
        {tier.features.map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>

      <button
        className="btn tier-card__cta"
        type="button"
        onClick={handleCtaClick}
        aria-label={`${tier.cta} — ${tier.price} per month`}
      >
        {tier.cta}
      </button>
    </div>
  );
}
