import { useState } from "react";
import { Onboard } from "./screens/Onboard.js";
import { StripeModal } from "./screens/StripeModal.js";
import { SensoBrief } from "./screens/SensoBrief.js";
import { VendorOnboarding } from "./screens/VendorOnboarding.js";

// Tiny pathname router. /evidence/:id is the public Senso fallback brief and
// renders with no app chrome. Everything else is the authenticated app.
function parseEvidenceId(pathname: string): string | undefined {
  const match = pathname.match(/^\/evidence\/([^/?#]+)\/?$/);
  return match?.[1];
}

function isOnboardingRoute(pathname: string): boolean {
  return /^\/onboarding\/?$/.test(pathname);
}

export function App(): JSX.Element {
  const pathname =
    typeof window !== "undefined" ? window.location.pathname : "/";
  const evidenceId = parseEvidenceId(pathname);

  if (evidenceId) {
    return <SensoBrief changeReportId={evidenceId} />;
  }

  if (isOnboardingRoute(pathname)) {
    return <VendorOnboardingApp />;
  }

  return <RedlineApp />;
}

function RedlineApp(): JSX.Element {
  const [showUpgrade, setShowUpgrade] = useState(false);
  return (
    <main className="app">
      <header className="app__header">
        <span className="app__mark">Redline</span>
        <span className="app__crumb">Add Vendor</span>
        <div className="app__actions" style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <a className="btn btn--ghost app__nav" href="/onboarding">
            Vendor Onboarding
          </a>
          <button
            className="btn btn--ghost app__upgrade"
            type="button"
            onClick={() => setShowUpgrade(true)}
          >
            Upgrade to Compliance Pack
          </button>
        </div>
      </header>
      <Onboard />
      {showUpgrade && <StripeModal onClose={() => setShowUpgrade(false)} />}
    </main>
  );
}

function VendorOnboardingApp(): JSX.Element {
  return (
    <main className="app">
      <header className="app__header">
        <span className="app__mark">Redline</span>
        <span className="app__crumb">Vendor Onboarding</span>
        <a
          className="btn btn--ghost"
          href="/"
          style={{ marginLeft: "auto" }}
          aria-label="Back to dashboard"
        >
          ← Back to Dashboard
        </a>
      </header>
      <VendorOnboarding />
    </main>
  );
}
