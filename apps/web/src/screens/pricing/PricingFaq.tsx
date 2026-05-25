import { ChevronDown } from "lucide-react";

const FAQ_ITEMS: ReadonlyArray<{ q: string; a: string }> = [
  {
    q: "Why no per-seat pricing?",
    a: "Per-seat pricing penalizes growth — adding a new team member to your SaaS management layer shouldn't cost more money. Flat platform fees let your whole organization use Unsyphn without counting heads.",
  },
  {
    q: "What counts as net savings (Enterprise variable component)?",
    a: "Net savings are verified reductions in SaaS spend: cancelled unused seats, renegotiated contracts below prior renewal price, and eliminated duplicate tools. We agree on a baseline at contract start and measure delta over 12 months. The 15% variable component is capped at $200K/yr regardless of savings achieved.",
  },
  {
    q: "Where is my data stored?",
    a: "All plans use US-based infrastructure by default. Enterprise adds EU data residency (separate EU instance, no cross-region replication) for GDPR-sensitive workloads. We publish our sub-processor list on our Trust Center.",
  },
  {
    q: "No-train AI guarantee?",
    a: "Unsyphn does not train models on customer data today. Should this change, we will provide customers with advance notice. Sensitive operations — clause extraction, Customer Commitments analysis — run on internally-hosted LLMs. Third-party API calls are made only under explicit DPA terms.",
  },
] as const;

const S = {
  section: {
    maxWidth: 1240,
    margin: "0 auto",
    padding: "0 var(--space-5) var(--space-9)",
  } as React.CSSProperties,
  h2: {
    fontFamily: "var(--font-display)",
    color: "var(--text-strong)",
    marginBottom: "var(--space-4)",
  } as React.CSSProperties,
  sm: { fontSize: "var(--text-sm)", color: "var(--text-2)" } as React.CSSProperties,
} as const;

export function PricingFaq(): JSX.Element {
  return (
    <section aria-label="Frequently asked questions" style={S.section}>
      <h2 className="h2" style={S.h2}>FAQ</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        {FAQ_ITEMS.map((item) => (
          <details
            key={item.q}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <summary
              style={{
                listStyle: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "var(--space-4) var(--space-5)",
                cursor: "pointer",
                fontWeight: 500,
                ...S.sm,
                color: "var(--text-strong)",
                userSelect: "none",
              }}
            >
              {item.q}
              <ChevronDown
                size={16}
                aria-hidden="true"
                style={{ color: "var(--text-muted)", flexShrink: 0 }}
                className="details-chevron"
              />
            </summary>
            <p style={{ padding: "0 var(--space-5) var(--space-4)", ...S.sm, lineHeight: 1.65, margin: 0 }}>
              {item.a}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
