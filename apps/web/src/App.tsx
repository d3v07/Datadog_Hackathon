import { useState } from "react";
import { Onboard } from "./screens/Onboard.js";
import { StripeModal } from "./screens/StripeModal.js";

export function App(): JSX.Element {
  const [showUpgrade, setShowUpgrade] = useState(false);
  return (
    <main className="app">
      <header className="app__header">
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
