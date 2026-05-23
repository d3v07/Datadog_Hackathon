import { useState } from "react";
import { Onboard } from "./screens/Onboard.js";
import { StripeModal } from "./screens/StripeModal.js";
import { SensoBrief } from "./screens/SensoBrief.js";

// Tiny pathname router. /evidence/:id is the public Senso fallback brief and
// renders with no app chrome. Everything else is the authenticated app.
function parseEvidenceId(pathname: string): string | undefined {
  const match = pathname.match(/^\/evidence\/([^/?#]+)\/?$/);
  return match?.[1];
}

export function App(): JSX.Element {
  const evidenceId =
    typeof window !== "undefined"
      ? parseEvidenceId(window.location.pathname)
      : undefined;

  if (evidenceId) {
    return <SensoBrief changeReportId={evidenceId} />;
  }

  return <RedlineApp />;
}

function RedlineApp(): JSX.Element {
  const [showUpgrade, setShowUpgrade] = useState(false);
  return (
    <main className="app">
      <header className="app__header">
        <img src="/logo.svg" alt="" className="app__logo" />
        <span className="app__mark">Redline</span>
        <span className="app__crumb">Add Vendor</span>
        <button
          className="btn btn--ghost app__upgrade"
          type="button"
          onClick={() => setShowUpgrade(true)}
        >
          Upgrade to Compliance Pack
        </button>
      </header>
      <Onboard />
      {showUpgrade && <StripeModal onClose={() => setShowUpgrade(false)} />}
    </main>
  );
}
