import { Check, ExternalLink } from "lucide-react";

const S = {
  page: {
    background: "var(--bg)",
    color: "var(--text)",
    fontFamily: "var(--font-text)",
    minHeight: "100vh",
    paddingTop: 80,
    paddingBottom: 80,
  },
  wrap: {
    maxWidth: 880,
    margin: "0 auto",
    padding: "0 var(--space-6)",
  },
  section: {
    paddingTop: "var(--space-7)",
    paddingBottom: "var(--space-7)",
    borderBottom: "1px solid var(--border)",
  },
  sectionLabel: {
    fontSize: "var(--text-xs)",
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.09em",
    color: "var(--text-muted)",
    marginBottom: "var(--space-4)",
    margin: "0 0 var(--space-4) 0",
  },
  body: {
    fontSize: "var(--text-base)",
    color: "var(--text)",
    lineHeight: 1.6,
    margin: 0,
  },
  muted: {
    fontSize: "var(--text-sm)",
    color: "var(--text-2)",
  },
  checkRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: "var(--space-2)",
    marginBottom: "var(--space-2)",
    fontSize: "var(--text-base)",
    color: "var(--text)",
  },
} as const;

const SUB_PROCESSORS = [
  { name: "Amazon Web Services", purpose: "Infrastructure",    region: "US-East-1", added: "2024-01" },
  { name: "Anthropic",           purpose: "LLM API",           region: "US",        added: "2024-09" },
  { name: "Stripe",              purpose: "Billing",           region: "US",        added: "2024-01" },
  { name: "Vercel",              purpose: "Web hosting",       region: "Global",    added: "2024-01" },
  { name: "ClickHouse Cloud",    purpose: "Analytics DB",      region: "US",        added: "2024-03" },
  { name: "Datadog",             purpose: "Observability",     region: "US",        added: "2024-02" },
] as const;

const SECURITY_ITEMS = [
  "SAML SSO + OIDC on all paid tiers (no SSO tax)",
  "SCIM provisioning on Scale + Enterprise",
  "RBAC with persona scopes (Finance / Procurement / Security / Legal / IT / Audit / Admin / Owner)",
  "Immutable audit trail (append-only, 7-year retention)",
  "Encrypted at rest (AES-256) and in transit (TLS 1.3)",
  "Citation-grounded AI — every AI output cites its source",
] as const;

const DOCUMENTS = [
  { label: "Master Service Agreement (MSA)",  href: "mailto:documents@unsyphn.com?subject=MSA%20Request" },
  { label: "Data Processing Agreement (DPA)", href: "mailto:documents@unsyphn.com?subject=DPA%20Request" },
  { label: "Security white paper",            href: "mailto:documents@unsyphn.com?subject=Security%20White%20Paper%20Request" },
] as const;

export function TrustCenter(): JSX.Element {
  return (
    <div style={S.page}>
      <div style={S.wrap}>

        {/* Header */}
        <div style={{ paddingBottom: "var(--space-7)", borderBottom: "1px solid var(--border)" }}>
          <h1
            className="h1"
            style={{ fontFamily: "var(--font-display)", color: "var(--text-strong)", marginBottom: "var(--space-3)" }}
          >
            Unsyphn Trust Center
          </h1>
          <p className="lead" style={{ color: "var(--text-2)", margin: 0 }}>
            Security, privacy, and reliability for enterprise.
          </p>
        </div>

        {/* 1. Certifications */}
        <section aria-labelledby="cert-heading" style={S.section}>
          <h2 id="cert-heading" style={S.sectionLabel}>Certifications</h2>
          {(["SOC 2 Type II (in audit — report Q4 2026)", "ISO 27001 (in audit)", "GDPR + DPF compliant"] as const).map((item) => (
            <div key={item} style={S.checkRow}>
              <Check size={16} color="var(--success)" aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
              <span>{item}</span>
            </div>
          ))}
          <p style={{ ...S.muted, marginTop: "var(--space-3)" }}>
            Roadmap: ISO 27701 (2027) · ISO 42001 AI (2027)
          </p>
        </section>

        {/* 2. Data Residency */}
        <section aria-labelledby="residency-heading" style={S.section}>
          <h2 id="residency-heading" style={S.sectionLabel}>Data Residency</h2>
          <p style={S.body}>
            <strong>US Region</strong> (default) · <strong>EU Region</strong> (Enterprise tier — Frankfurt)
          </p>
          <p style={{ ...S.muted, marginTop: "var(--space-2)" }}>
            Data never leaves your selected region.
          </p>
        </section>

        {/* 3. No-Train AI Guarantee */}
        <section aria-labelledby="notrain-heading" style={S.section}>
          <h2 id="notrain-heading" style={S.sectionLabel}>No-Train AI Guarantee</h2>
          <p style={{ ...S.body, marginBottom: "var(--space-3)" }}>
            Unsyphn does not train models on customer data today. Should this change, we will provide
            customers with advance notice. Third-party LLM providers we use are contracted under DPAs
            that prohibit training on data we share with them.
          </p>
          <p style={S.body}>
            Sensitive operations (clause extraction, Customer Commitments inventory) run on
            internally-hosted models.
          </p>
        </section>

        {/* 4. Sub-Processors */}
        <section aria-labelledby="subproc-heading" style={S.section}>
          <h2 id="subproc-heading" style={S.sectionLabel}>Sub-Processors</h2>

          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "var(--text-sm)",
              }}
            >
              <thead>
                <tr>
                  {(["Name", "Purpose", "Region", "Added"] as const).map((col) => (
                    <th
                      key={col}
                      scope="col"
                      style={{
                        textAlign: "left",
                        fontWeight: 500,
                        color: "var(--text-muted)",
                        fontSize: "var(--text-xs)",
                        padding: "0 var(--space-3) var(--space-2) 0",
                        borderBottom: "1px solid var(--border)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SUB_PROCESSORS.map((sp) => (
                  <tr key={sp.name}>
                    {([sp.name, sp.purpose, sp.region, sp.added] as const).map((cell, i) => (
                      <td
                        key={i}
                        style={{
                          padding: "var(--space-2) var(--space-3) var(--space-2) 0",
                          borderBottom: "1px solid var(--border)",
                          color: i === 0 ? "var(--text)" : "var(--text-2)",
                          fontWeight: i === 0 ? 500 : 400,
                        }}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <SubscribeForm />

          <p style={{ ...S.muted, marginTop: "var(--space-3)" }}>
            We send 30-day advance notice before adding any new sub-processor.
          </p>
        </section>

        {/* 5. Security Practices */}
        <section aria-labelledby="security-heading" style={S.section}>
          <h2 id="security-heading" style={S.sectionLabel}>Security Practices</h2>
          {SECURITY_ITEMS.map((item) => (
            <div key={item} style={S.checkRow}>
              <Check size={16} color="var(--success)" aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
              <span>{item}</span>
            </div>
          ))}
        </section>

        {/* 6. Documents */}
        <section aria-labelledby="docs-heading" style={S.section}>
          <h2 id="docs-heading" style={S.sectionLabel}>Documents</h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {DOCUMENTS.map((doc) => (
              <li key={doc.label}>
                <a
                  href={doc.href}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "var(--space-2)",
                    fontSize: "var(--text-base)",
                    color: "var(--accent)",
                    textDecoration: "none",
                    fontWeight: 400,
                  }}
                >
                  <ExternalLink size={14} aria-hidden="true" />
                  {doc.label}
                  <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                    [Download PDF]
                  </span>
                </a>
              </li>
            ))}
            <li>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--text-base)", color: "var(--text)" }}>
                SOC 2 readiness summary
              </span>
              {" — "}
              <a
                href="mailto:security@unsyphn.com?subject=SOC2%20Readiness%20Summary%20Request"
                style={{ fontSize: "var(--text-base)", color: "var(--accent)", textDecoration: "none" }}
              >
                Request via security@unsyphn.com
              </a>
            </li>
          </ul>
        </section>

        {/* 7. Contact */}
        <section aria-labelledby="contact-heading" style={{ ...S.section, borderBottom: "none" }}>
          <h2 id="contact-heading" style={S.sectionLabel}>Contact</h2>
          <dl style={{ margin: 0, display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {(
              [
                ["Security disclosures", "security@unsyphn.com"],
                ["Privacy questions",    "privacy@unsyphn.com"],
                ["Bug bounty",          "security@unsyphn.com"],
              ] as const
            ).map(([label, email]) => (
              <div key={label} style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" as const }}>
                <dt style={S.muted}>{label}:</dt>
                <dd style={{ margin: 0 }}>
                  <a href={`mailto:${email}`} style={{ color: "var(--accent)", fontSize: "var(--text-sm)" }}>
                    {email}
                  </a>
                  {label === "Bug bounty" && (
                    <span style={{ ...S.muted, marginLeft: "var(--space-2)" }}>(no public program yet)</span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Footer */}
        <p style={{ ...S.muted, paddingTop: "var(--space-5)", textAlign: "center" }}>
          Last reviewed: May 24, 2026 · Version 1.0
        </p>

      </div>
    </div>
  );
}

function SubscribeForm(): JSX.Element {
  const emailId = "trust-subscribe-email";
  return (
    <form
      style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-4)", flexWrap: "wrap" as const }}
      onSubmit={(e) => {
        e.preventDefault();
        alert("Subscribed (demo mode)");
      }}
    >
      <label htmlFor={emailId} style={{ ...S.muted, display: "flex", alignItems: "center", whiteSpace: "nowrap" as const }}>
        Subscribe to change notifications:
      </label>
      <input
        id={emailId}
        name="email"
        type="email"
        required
        className="input"
        placeholder="your@email.com"
        style={{ maxWidth: 220, flex: "0 0 auto" }}
        aria-label="Email for sub-processor change notifications"
      />
      <button type="submit" className="btn btn-secondary">
        Subscribe
      </button>
    </form>
  );
}
