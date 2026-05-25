import { Check } from "lucide-react";

// Phase 8 — add-on cart. Selected add-ons stay highlighted; total is lifted to
// the parent so it can appear under tier price and be passed into the modal.

export interface AddOnDef {
  id: string;
  name: string;
  priceLabel: string;
  monthlyCents: number;
  description: string;
  mailto: string;
}

export const ADD_ONS: ReadonlyArray<AddOnDef> = [
  {
    id: "negotiation-concierge",
    name: "Negotiation Concierge",
    priceLabel: "$10K/quarter",
    // ~$3.33K/mo equivalent. Concrete monthly cents for the cart sum.
    monthlyCents: 333_333,
    description:
      "Human procurement analyst handles 5 negotiations per quarter end-to-end.",
    mailto: "hello@unsyphn.com?subject=Negotiation%20Concierge%20add-on",
  },
  {
    id: "grc-bridge",
    name: "GRC Bridge",
    priceLabel: "$1,000/mo",
    monthlyCents: 100_000,
    description:
      "Deep two-way Vanta + Drata + OneTrust integration; auto-Trust-Center sync.",
    mailto: "hello@unsyphn.com?subject=GRC%20Bridge%20add-on",
  },
] as const;

interface PricingAddOnsProps {
  selected: ReadonlySet<string>;
  onToggle: (id: string) => void;
}

const S = {
  section: {
    maxWidth: 1240,
    margin: "0 auto",
    padding: "0 var(--space-5) var(--space-7)",
  } as React.CSSProperties,
  h2: {
    fontFamily: "var(--font-display)",
    color: "var(--text-strong)",
    marginBottom: "var(--space-4)",
  } as React.CSSProperties,
  sm: { fontSize: "var(--text-sm)", color: "var(--text-2)" } as React.CSSProperties,
  mono500: { fontFamily: "var(--font-mono)", fontWeight: 500 } as React.CSSProperties,
} as const;

export function PricingAddOns({ selected, onToggle }: PricingAddOnsProps): JSX.Element {
  return (
    <section aria-label="Add-ons" style={S.section}>
      <h2 className="h2" style={S.h2}>Add-ons</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "var(--space-4)",
        }}
      >
        {ADD_ONS.map((a) => {
          const isSelected = selected.has(a.id);
          return (
            <div
              key={a.id}
              className="card"
              style={{
                padding: "var(--space-5)",
                outline: isSelected ? "2px solid var(--accent)" : undefined,
                transition: "outline-color 100ms",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "var(--space-2)",
                }}
              >
                <h3
                  style={{
                    fontFamily: "var(--font-text)",
                    fontWeight: 600,
                    fontSize: "var(--text-base)",
                    margin: 0,
                    color: "var(--text-strong)",
                  }}
                >
                  {a.name}
                </h3>
                <span
                  style={{
                    ...S.mono500,
                    fontSize: "var(--text-sm)",
                    color: "var(--accent)",
                    whiteSpace: "nowrap",
                    marginLeft: "var(--space-3)",
                  }}
                >
                  {a.priceLabel}
                </span>
              </div>
              <p style={{ ...S.sm, margin: "0 0 var(--space-4)", lineHeight: 1.5 }}>
                {a.description}
              </p>
              <div style={{ display: "flex", gap: "var(--space-2)" }}>
                <button
                  type="button"
                  onClick={() => onToggle(a.id)}
                  className={isSelected ? "btn btn-primary" : "btn btn-secondary"}
                  style={{ flex: 1, justifyContent: "center" }}
                  aria-pressed={isSelected}
                  data-testid={`addon-${a.id}`}
                >
                  {isSelected ? (
                    <>
                      <Check size={14} aria-hidden="true" /> Added
                    </>
                  ) : (
                    "Add to plan"
                  )}
                </button>
                <a
                  href={`mailto:${a.mailto}`}
                  className="btn btn-secondary"
                  style={{ justifyContent: "center" }}
                >
                  Enquire
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function addOnMonthlyCents(selected: ReadonlySet<string>): number {
  let total = 0;
  for (const a of ADD_ONS) {
    if (selected.has(a.id)) total += a.monthlyCents;
  }
  return total;
}
