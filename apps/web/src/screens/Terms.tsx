import { PageShell } from "../components/PageShell.js";

export function Terms(): JSX.Element {
  return (
    <PageShell active={null}>
      <header className="public-hero fade-up">
        <h1>Terms of Service</h1>
        <p className="lead">Last updated: May 2026</p>
      </header>

      <div className="stagger-children">
      <section className="public-section glass-soft" aria-labelledby="accept" style={{ padding: 24, borderRadius: 14 }}>
        <h2 id="accept">Acceptance</h2>
        <p>
          By creating an Unsyphn workspace or using any portion of the service,
          you agree to these terms on behalf of yourself and the organization
          you represent. If you do not have authority to bind your organization,
          do not accept these terms.
        </p>
      </section>

      <section className="public-section glass-soft" aria-labelledby="service" style={{ padding: 24, borderRadius: 14 }}>
        <h2 id="service">Service description</h2>
        <p>
          Unsyphn is a subscription operations platform that discovers,
          monitors, and routes signals about the SaaS, AI, and infrastructure
          vendors your organization uses. The service is delivered as software
          accessed over the public internet and may include integrations with
          third-party systems you choose to connect.
        </p>
      </section>

      <section className="public-section glass-soft" aria-labelledby="use" style={{ padding: 24, borderRadius: 14 }}>
        <h2 id="use">Acceptable use</h2>
        <p>
          You agree not to: reverse-engineer the service, attempt to bypass
          access controls, upload malware, scrape at rates that degrade
          availability for other customers, or use the service to violate any
          law. We may suspend access without notice if we reasonably believe
          continued use poses a risk to our infrastructure or other customers.
        </p>
      </section>

      <section className="public-section glass-soft" aria-labelledby="billing" style={{ padding: 24, borderRadius: 14 }}>
        <h2 id="billing">Subscription &amp; billing</h2>
        <p>
          Paid plans are billed monthly or annually in advance via the pricing
          tier you select. Fees are non-refundable except where required by
          law. We will give 30 days&rsquo; notice for any price change taking
          effect at renewal. The Discover tier is free; usage limits apply and
          are published on the <a href="/pricing">pricing page</a>.
        </p>
      </section>

      <section className="public-section glass-soft" aria-labelledby="liability" style={{ padding: 24, borderRadius: 14 }}>
        <h2 id="liability">Liability</h2>
        <p>
          The service is provided &ldquo;as is&rdquo; without warranties of any
          kind. To the maximum extent permitted by law, Unsyphn&rsquo;s total
          liability for any claim arising from these terms or the service is
          limited to the fees paid in the 12 months preceding the claim. We are
          not liable for indirect or consequential damages, including lost
          profits, lost data, or lost goodwill.
        </p>
      </section>

      <section className="public-section glass-soft" aria-labelledby="terminate" style={{ padding: 24, borderRadius: 14 }}>
        <h2 id="terminate">Termination</h2>
        <p>
          You may cancel at any time from your billing settings; cancellation
          takes effect at the end of the current billing period. We may
          terminate immediately for breach, non-payment, or if continued
          provision becomes unlawful. On termination we will retain account
          data for 30 days, then permanently delete it; export tooling is
          available throughout the retention window.
        </p>
      </section>

      <section className="public-section glass-soft" aria-labelledby="changes" style={{ padding: 24, borderRadius: 14 }}>
        <h2 id="changes">Changes</h2>
        <p>
          We may update these terms from time to time. Material changes will be
          announced via email and in-app at least 30 days before they take
          effect. Continued use after the effective date constitutes acceptance.
        </p>
      </section>

      <section className="public-section glass-soft" aria-labelledby="law" style={{ padding: 24, borderRadius: 14 }}>
        <h2 id="law">Governing law</h2>
        <p>
          These terms are governed by the laws of the State of Delaware,
          excluding its conflict-of-laws rules. Any dispute will be resolved in
          the state or federal courts located in Wilmington, Delaware.
        </p>
        <p>
          Questions: <a href="mailto:legal@unsyphn.com">legal@unsyphn.com</a>.
        </p>
      </section>
      </div>
    </PageShell>
  );
}
