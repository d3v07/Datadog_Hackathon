import { PageShell } from "../components/PageShell.js";

export function Privacy(): JSX.Element {
  return (
    <PageShell active={null}>
      <header className="public-hero">
        <h1>Privacy Policy</h1>
        <p className="lead">Last updated: May 2026</p>
      </header>

      <section className="public-section" aria-labelledby="collect">
        <h2 id="collect">What we collect</h2>
        <p>
          Unsyphn collects two kinds of data: account information you give us
          directly (name, work email, company) and workspace metadata we read
          from connected systems (Google Workspace, Microsoft 365, SSO logs,
          accounting and procurement tools). We only read what is necessary to
          surface the SaaS footprint your team is already paying for.
        </p>
        <p>
          We do not read message bodies, attachments, or document contents
          unless you explicitly opt-in to clause extraction on a per-contract
          basis. OAuth scopes are minimal-read and listed at connection time so
          you see exactly what is being requested.
        </p>
      </section>

      <section className="public-section" aria-labelledby="use">
        <h2 id="use">How we use it</h2>
        <p>
          Workspace metadata is used to detect vendors, score risk, track
          renewals, and route material changes to the channels you configure
          (Slack, Jira, email, calendar). Account information powers billing,
          audit trails, and customer support.
        </p>
        <p>
          We do not sell or rent your data. We do not train models on your data
          today; should this ever change we will give you advance notice and a
          clear path to opt out.
        </p>
      </section>

      <section className="public-section" aria-labelledby="subs">
        <h2 id="subs">Sub-processors</h2>
        <p>
          A current list of sub-processors and their regions is published on the
          {" "}<a href="/trust">Trust Center</a>. We provide 30 days&rsquo; notice
          before adding any new sub-processor; you can subscribe to that feed
          from the Trust Center page.
        </p>
      </section>

      <section className="public-section" aria-labelledby="rights">
        <h2 id="rights">Your rights (GDPR &amp; CCPA)</h2>
        <p>
          You have the right to access, correct, export, and delete personal
          data we hold about you. For workspace data, the workspace owner is
          the controller and we act as a processor under our Data Processing
          Agreement.
        </p>
        <p>
          Requests are handled within 30 days. EU and UK customers can pin data
          to our Frankfurt region on the Enterprise tier; data never crosses
          regional boundaries once pinned.
        </p>
      </section>

      <section className="public-section" aria-labelledby="contact">
        <h2 id="contact">Contact us</h2>
        <p>
          Privacy questions: <a href="mailto:privacy@unsyphn.com">privacy@unsyphn.com</a>.
          Security disclosures: <a href="mailto:security@unsyphn.com">security@unsyphn.com</a>.
          General: <a href="/contact">/contact</a>.
        </p>
      </section>
    </PageShell>
  );
}
