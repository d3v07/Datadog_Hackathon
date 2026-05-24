import { useEffect, useState } from "react";
import { Onboard } from "./screens/Onboard.js";
import { StripeModal } from "./screens/StripeModal.js";
import { SensoBrief } from "./screens/SensoBrief.js";
import { VendorOnboarding } from "./screens/VendorOnboarding.js";

function parseEvidenceId(pathname: string): string | undefined {
  const match = pathname.match(/^\/evidence\/([^/?#]+)\/?$/);
  return match?.[1];
}

function isOnboardingRoute(pathname: string): boolean {
  return /^\/onboarding\/?$/.test(pathname);
}

function isDashboardRoute(pathname: string): boolean {
  return /^\/dashboard\/?$/.test(pathname);
}

export function App(): JSX.Element | null {
  const pathname =
    typeof window !== "undefined" ? window.location.pathname : "/";
  const isAppRoute =
    isOnboardingRoute(pathname) ||
    isDashboardRoute(pathname) ||
    Boolean(parseEvidenceId(pathname));

  useEffect(() => {
    if (isAppRoute) {
      document.body.classList.add("app-mode");
    }
    return () => {
      document.body.classList.remove("app-mode");
    };
  }, [isAppRoute]);

  const evidenceId = parseEvidenceId(pathname);
  if (evidenceId) {
    return <SensoBrief changeReportId={evidenceId} />;
  }

  if (isOnboardingRoute(pathname)) {
    return <VendorOnboardingApp />;
  }

  if (isDashboardRoute(pathname)) {
    const tier = typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("tier")
      : null;
    const parsed = tier ? parseInt(tier, 10) : NaN;
    const tierNum = parsed === 1 || parsed === 2 || parsed === 3 ? parsed : undefined;
    return <DashboardApp prefillTier={tierNum} />;
  }

  return null;
}

interface DashboardAppProps {
  prefillTier?: 1 | 2 | 3;
}

function DashboardApp({ prefillTier }: DashboardAppProps): JSX.Element {
  const [showUpgrade, setShowUpgrade] = useState(false);
  return (
    <main className="app">
      <header className="app__header">
        <img src="/logo.png" alt="Unsyphn" className="app__mark" style={{ height: 28, width: "auto" }} />
        <nav aria-label="breadcrumb">
          <span className="app__crumb">Add Vendor</span>
        </nav>
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
      <Onboard prefillTier={prefillTier} />
      {showUpgrade && <StripeModal onClose={() => setShowUpgrade(false)} />}
    </main>
  );
}

function VendorOnboardingApp(): JSX.Element {
  return (
    <main className="app">
      <header className="app__header">
        <img src="/logo.png" alt="Unsyphn" className="app__mark" style={{ height: 28, width: "auto" }} />
        <nav aria-label="breadcrumb">
          <span className="app__crumb">Vendor Onboarding</span>
        </nav>
        <a
          className="btn btn--ghost"
          href="/dashboard"
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
