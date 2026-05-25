import type { ReactNode } from "react";

interface PageShellProps {
  active?: "product" | "pricing" | "trust" | "demo" | "contact" | "docs" | null;
  children: ReactNode;
}

const NAV_LINKS = [
  { key: "product", label: "Product", href: "/" },
  { key: "pricing", label: "Pricing", href: "/pricing" },
  { key: "trust", label: "Trust", href: "/trust" },
  { key: "docs", label: "Docs", href: "/docs" },
] as const;

export function PageShell({ active = null, children }: PageShellProps): JSX.Element {
  return (
    <div className="public-page">
      <div className="public-aurora" aria-hidden="true" />
      <div className="public-grain" aria-hidden="true" />

      <nav className="public-nav" aria-label="Primary">
        <a className="brand" href="/" aria-label="Unsyphn home">
          <img src="/unsyphn-mark.png" alt="" width={28} height={20} />
          <span>UNSYPHN / Subscription OS</span>
        </a>
        <ul>
          {NAV_LINKS.map((l) => (
            <li key={l.key}>
              <a href={l.href} className={active === l.key ? "is-active" : ""}>
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <a href="/app/" className="cta">Get access →</a>
      </nav>

      <main className="public-main">{children}</main>

      <PublicFooter />
    </div>
  );
}

function PublicFooter(): JSX.Element {
  return (
    <footer className="public-footer">
      <div className="inner">
        <div className="top">
          <div>
            <div className="brand">
              <img src="/unsyphn-mark.png" alt="Unsyphn" width={28} height={20} />
              <span>UNSYPHN</span>
            </div>
            <p className="tagline">One vault for every subscription. Built for the modern ops team.</p>
          </div>
          <div>
            <h5>Product</h5>
            <nav aria-label="Product links">
              <a href="/">Overview</a>
              <a href="/pricing">Pricing</a>
              <a href="/app/">Vault</a>
              <a href="/app/">Get access</a>
            </nav>
          </div>
          <div>
            <h5>Company</h5>
            <nav aria-label="Company links">
              <a href="/contact">Contact</a>
              <a href="/privacy">Privacy</a>
              <a href="/terms">Terms</a>
              <a href="/trust">Trust</a>
            </nav>
          </div>
          <div>
            <h5>Resources</h5>
            <nav aria-label="Resource links">
              <a href="/demo">Demo</a>
              <a href="https://github.com/d3v07/Datadog_Hackathon" rel="noopener">Source</a>
              <a href="/docs">Docs</a>
            </nav>
          </div>
        </div>
        <div className="bottom">
          <span>© 2026 Unsyphn · All rights reserved</span>
          <span>Built for the Datadog hackathon</span>
        </div>
      </div>
    </footer>
  );
}
