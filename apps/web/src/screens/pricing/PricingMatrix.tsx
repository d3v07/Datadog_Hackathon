import { Check, Minus, ChevronDown } from "lucide-react";
import { TIERS, type TierId } from "./tiers.js";

// Matrix data keyed by TierId so adding tiers later doesn't require touching
// each row.
type RowState = boolean | "contact";

interface MatrixRow {
  feature: string;
  byTier: Partial<Record<TierId, RowState>>;
}

interface MatrixSection {
  label: string;
  rows: ReadonlyArray<MatrixRow>;
}

const SECTIONS: ReadonlyArray<MatrixSection> = [
  {
    label: "Discovery & Inventory",
    rows: [
      {
        feature: "Google / M365 OAuth discovery",
        byTier: {
          discover: true, starter: true, growth: true, scale: true, enterprise: true, custom: true,
        },
      },
      {
        feature: "Unlimited vendor cards",
        byTier: {
          discover: false, starter: false, growth: true, scale: true, enterprise: true, custom: true,
        },
      },
      {
        feature: "OAuth-grant risk scoring",
        byTier: {
          discover: false, starter: false, growth: true, scale: true, enterprise: true, custom: true,
        },
      },
      {
        feature: "AI-predict from domain",
        byTier: {
          discover: true, starter: true, growth: true, scale: true, enterprise: true, custom: true,
        },
      },
    ],
  },
  {
    label: "Renewal & Negotiation",
    rows: [
      {
        feature: "Renewal calendar + 30/60/90-day alerts",
        byTier: {
          discover: false, starter: false, growth: true, scale: true, enterprise: true, custom: true,
        },
      },
      {
        feature: "One-click Renegotiation Packet",
        byTier: {
          discover: false, starter: false, growth: true, scale: true, enterprise: true, custom: true,
        },
      },
      {
        feature: "Material Change Feed",
        byTier: {
          discover: false, starter: false, growth: true, scale: true, enterprise: true, custom: true,
        },
      },
      {
        feature: "Dedicated negotiation analyst",
        byTier: {
          discover: false, starter: false, growth: false, scale: false, enterprise: true, custom: true,
        },
      },
    ],
  },
  {
    label: "Risk, Compliance & Audit",
    rows: [
      {
        feature: "Audit log",
        byTier: {
          discover: true, starter: true, growth: true, scale: true, enterprise: true, custom: true,
        },
      },
      {
        feature: "Sub-processor heatmap",
        byTier: {
          discover: false, starter: false, growth: false, scale: true, enterprise: true, custom: true,
        },
      },
      {
        feature: "Customer Commitments extraction",
        byTier: {
          discover: false, starter: false, growth: false, scale: true, enterprise: true, custom: true,
        },
      },
      {
        feature: "Data residency (US / EU)",
        byTier: {
          discover: false, starter: false, growth: false, scale: false, enterprise: true, custom: true,
        },
      },
      {
        feature: "SCIM provisioning",
        byTier: {
          discover: false, starter: false, growth: false, scale: true, enterprise: true, custom: true,
        },
      },
      {
        feature: "99.9% SLA",
        byTier: {
          discover: false, starter: false, growth: false, scale: false, enterprise: true, custom: "contact",
        },
      },
    ],
  },
];

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
} as const;

// Use a real <table> for accessibility / screen-reader semantics. Tiers form
// the columns.
export function PricingMatrix(): JSX.Element {
  return (
    <section aria-label="Feature comparison" style={S.section}>
      <h2 className="h2" style={S.h2}>
        Feature comparison
      </h2>
      <style>{`details[open] .details-chevron { transform: rotate(180deg); }`}</style>
      {SECTIONS.map((ms) => (
        <details key={ms.label} style={{ marginBottom: "var(--space-3)" }}>
          <summary
            style={{
              listStyle: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "var(--space-4) var(--space-5)",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              cursor: "pointer",
              fontWeight: 600,
              ...S.sm,
              color: "var(--text-strong)",
              userSelect: "none",
            }}
          >
            {ms.label}
            <ChevronDown
              size={16}
              aria-hidden="true"
              style={{
                color: "var(--text-muted)",
                transition: "transform var(--dur-fast)",
                flexShrink: 0,
              }}
              className="details-chevron"
            />
          </summary>
          <div
            style={{
              border: "1px solid var(--border)",
              borderTop: "none",
              borderRadius: "0 0 var(--radius-md) var(--radius-md)",
              overflow: "auto",
            }}
          >
            <table
              style={{
                width: "100%",
                minWidth: 720,
                borderCollapse: "collapse",
                background: "var(--surface)",
              }}
            >
              <thead>
                <tr style={{ background: "var(--surface-2)" }}>
                  <th
                    scope="col"
                    style={{
                      padding: "var(--space-2) var(--space-5)",
                      textAlign: "left",
                      fontSize: "var(--text-xs)",
                      color: "var(--text-muted)",
                      fontWeight: 500,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    Feature
                  </th>
                  {TIERS.map((t) => (
                    <th
                      key={t.id}
                      scope="col"
                      style={{
                        padding: "var(--space-2) var(--space-3)",
                        textAlign: "center",
                        fontSize: "var(--text-xs)",
                        color: "var(--text-muted)",
                        fontWeight: 500,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      {t.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ms.rows.map((row) => (
                  <tr key={row.feature}>
                    <th
                      scope="row"
                      style={{
                        padding: "var(--space-2) var(--space-5)",
                        textAlign: "left",
                        fontWeight: 400,
                        borderBottom: "1px solid var(--border)",
                        ...S.sm,
                      }}
                    >
                      {row.feature}
                    </th>
                    {TIERS.map((t) => {
                      const state = row.byTier[t.id] ?? false;
                      return (
                        <td
                          key={t.id}
                          style={{
                            padding: "var(--space-2) var(--space-3)",
                            textAlign: "center",
                            borderBottom: "1px solid var(--border)",
                          }}
                          aria-label={
                            state === "contact"
                              ? "Contact sales"
                              : state
                                ? "Included"
                                : "Not included"
                          }
                        >
                          {state === "contact" ? (
                            <span
                              style={{
                                fontSize: "var(--text-xs)",
                                color: "var(--accent)",
                              }}
                            >
                              Contact
                            </span>
                          ) : state ? (
                            <Check
                              size={14}
                              aria-hidden="true"
                              style={{ color: "var(--success)" }}
                            />
                          ) : (
                            <Minus
                              size={14}
                              aria-hidden="true"
                              style={{ color: "var(--text-disabled)" }}
                            />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ))}
    </section>
  );
}
