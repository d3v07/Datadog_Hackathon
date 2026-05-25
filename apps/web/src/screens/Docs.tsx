import { PageShell } from "../components/PageShell.js";

interface DocSection {
  title: string;
  blurb: string;
  subject: string;
}

const SECTIONS: readonly DocSection[] = [
  {
    title: "Getting started",
    blurb: "Provision a workspace, invite your first teammate, and ship the 14-minute onboarding flow.",
    subject: "Getting Started",
  },
  {
    title: "Connect data sources",
    blurb: "Google Workspace, Microsoft 365, Okta SSO — minimal-read scopes, OAuth-only, no agents.",
    subject: "Connect Data Sources",
  },
  {
    title: "Vendor discovery",
    blurb: "How the agent infers vendors from email metadata, OAuth grants, and SSO logs.",
    subject: "Vendor Discovery",
  },
  {
    title: "Policy studio",
    blurb: "Author policies as composable rules. Approvals, escalations, severity scoring.",
    subject: "Policy Studio",
  },
  {
    title: "Material Change Feed",
    blurb: "Subscribe to vendor changes that matter — price, DPA, sub-processor, security posture.",
    subject: "Material Change Feed",
  },
  {
    title: "API reference",
    blurb: "REST endpoints, webhooks, and the read-only GraphQL surface for analytics tooling.",
    subject: "API Reference",
  },
  {
    title: "Integrations",
    blurb: "Slack, Jira, email, calendar. Two-way routing, ack-back, and human-in-the-loop.",
    subject: "Integrations",
  },
] as const;

function href(subject: string): string {
  const params = new URLSearchParams({ subject });
  return `mailto:docs@unsyphn.com?${params.toString()}`;
}

export function Docs(): JSX.Element {
  return (
    <PageShell active="docs">
      <header className="public-hero fade-up">
        <h1>Docs</h1>
        <p className="lead">Everything you need to wire Unsyphn into your stack.</p>
      </header>

      <section className="public-section" aria-label="Documentation sections">
        <div className="public-grid stagger-children">
          {SECTIONS.map((s) => (
            <article key={s.title} className="public-card glass-strong lift-on-hover">
              <h3>{s.title}</h3>
              <p>{s.blurb}</p>
              <a
                href={href(s.subject)}
                aria-label={`Read ${s.title}`}
                style={{ transition: "color var(--dur-sm) var(--ease-out)" }}
              >
                Read more →
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="public-section fade-up" aria-labelledby="help">
        <h2 id="help">Need a hand?</h2>
        <p>
          Most teams self-serve onboarding in under 20 minutes. If you hit a
          wall, ping <a href="mailto:docs@unsyphn.com">docs@unsyphn.com</a> or
          book a live walkthrough at <a href="/demo">/demo</a>.
        </p>
      </section>
    </PageShell>
  );
}
