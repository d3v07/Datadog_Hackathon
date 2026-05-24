// app.jsx — top-level Unsyphn app: state, navigation, screen mounting

function App() {
  // ── state ────────────────────────────────────────────
  const [state, setState] = React.useState({
    screen: "portfolio",     // "portfolio" | "change" | "evidence" | "onboarding"
    escalateOpen: false,
    routing: false,          // overlay routing transition
    notion: "P1",            // "P1" | "ROUTED"
    routeTime: null,
    evidenceCount: 432,
    activeVendor: "notion",  // which vendor the change/evidence screens render
    onboardingTier: "24h",
    onboardedToast: null,    // { name, tierLabel } | null
  });

  // ── dispatcher ───────────────────────────────────────
  function dispatch(action) {
    switch (action.type) {
      case "goto":
        setState((s) => ({ ...s, screen: action.screen }));
        setTimeout(() => {
          const m = document.querySelector(".app-shell .main");
          if (m) m.scrollTo(0, 0);
        }, 0);
        return;
      case "open-vendor":
        setState((s) => ({ ...s, activeVendor: action.vendor, screen: "change" }));
        setTimeout(() => {
          const m = document.querySelector(".app-shell .main");
          if (m) m.scrollTo(0, 0);
        }, 0);
        return;
      case "open-vendor-bundle":
        setState((s) => ({ ...s, activeVendor: action.vendor, screen: "evidence" }));
        setTimeout(() => {
          const m = document.querySelector(".app-shell .main");
          if (m) m.scrollTo(0, 0);
        }, 0);
        return;
      case "open-escalate":
        setState((s) => ({ ...s, escalateOpen: true }));
        return;
      case "close-escalate":
        setState((s) => ({ ...s, escalateOpen: false }));
        return;
      case "confirm-escalate":
        setState((s) => ({ ...s, escalateOpen: false, routing: true }));
        return;
      case "finish-routing":
        setState((s) => ({
          ...s,
          routing: false,
          notion: "ROUTED",
          routeTime: "14:59:18 EST",
          evidenceCount: 433,
          screen: "evidence",
          activeVendor: "notion",
        }));
        setTimeout(() => {
          const m = document.querySelector(".app-shell .main");
          if (m) m.scrollTo(0, 0);
        }, 0);
        return;
      case "reset-flow":
        setState({
          screen: "portfolio",
          escalateOpen: false,
          routing: false,
          notion: "P1",
          routeTime: null,
          evidenceCount: 432,
          activeVendor: "notion",
          onboardingTier: "24h",
          onboardedToast: null,
        });
        return;
      case "vendor-onboarded":
        setState((s) => ({
          ...s,
          screen: "portfolio",
          onboardingTier: action.tier,
          onboardedToast: {
            name: action.name,
            tierLabel: action.tierLabel,
            vendorId: action.vendorId,
            firstScanRunId: action.firstScanRunId,
          },
        }));
        setTimeout(() => setState((s) => ({ ...s, onboardedToast: null })), 5500);
        setTimeout(() => {
          const m = document.querySelector(".app-shell .main");
          if (m) m.scrollTo(0, 0);
        }, 0);
        return;
      case "acknowledge":
        // state.notion is constrained to "P1" | "ROUTED" — don't widen it here.
        // Acknowledge is a demo no-op until the lifecycle state machine is wired.
        window.alert("Acknowledged. Lifecycle hand-off coming soon.");
        return;
      case "snooze":
        window.alert("Snoozed for 48h. Lifecycle hand-off coming soon.");
        return;
      case "open-copilot":
        window.alert("Copilot coming soon");
        return;
      case "export-diff": {
        const DATA = window.VENDOR_DATA || {};
        const vendor = DATA[state.activeVendor] || {};
        const body = JSON.stringify({ vendor: state.activeVendor, diffs: (vendor.cr || {}).diffs || [] }, null, 2);
        const url = URL.createObjectURL(new Blob([body], { type: "application/json" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = (state.activeVendor || "vendor") + "-diff.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        return;
      }
      case "assign":
        window.alert("Owner assignment coming soon");
        return;
      case "download-bundle":
        window.print();
        return;
      case "share-audit":
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(location.href).then(
            function () { window.alert("Audit link copied"); },
            function () { window.prompt("Copy the audit link:", location.href); }
          );
        } else {
          window.prompt("Copy the audit link:", location.href);
        }
        return;
      default:
        globalThis["console"].warn("unknown action", action);
    }
  }

  // ── browser tabs ─────────────────────────────────────
  const activeRec = (window.VENDOR_DATA || {})[state.activeVendor] || {};
  const vendorSlug = (activeRec.name || "vendor").toLowerCase();
  const bundleSlug = ((activeRec.cr && activeRec.cr.bundleId) || "").replace("·", "-");
  const url = state.screen === "portfolio"
    ? "app.unsyphn.com/portfolio"
    : state.screen === "change"
    ? `app.unsyphn.com/${vendorSlug}/${bundleSlug || "cr"}`
    : state.screen === "onboarding"
    ? "app.unsyphn.com/onboard"
    : `app.unsyphn.com/bundle/${bundleSlug || "cr"}`;

  const secondTabTitle = state.screen === "portfolio"
    ? "Notion · ToS"
    : state.screen === "onboarding"
    ? "Onboard Vendor"
    : `${activeRec.name || "Vendor"} · ${state.screen === "evidence" ? "Bundle" : "Change"}`;

  const tabs = [
    { title: "Unsyphn · Portfolio" },
    { title: secondTabTitle },
    { title: "DPA · Acme ⟷ Notion" },
  ];

  return (
    <div style={{ width: 1440, height: 900, position: "relative" }}>
      <ChromeWindow tabs={tabs} activeIndex={0} url={url} width={1440} height={900}>
        <div className="app-shell">
          <Sidebar
            active={state.screen === "evidence" ? "evidence" : state.screen === "change" ? "changes" : "portfolio"}
            dispatch={dispatch}
            state={state}
          />
          {state.screen === "portfolio"   && <ScreenPortfolio state={state} dispatch={dispatch} />}
          {state.screen === "change"      && <ScreenChange state={state} dispatch={dispatch} />}
          {state.screen === "evidence"    && <ScreenEvidence state={state} dispatch={dispatch} />}
          {state.screen === "onboarding"  && <ScreenOnboarding state={state} dispatch={dispatch} />}

          {state.escalateOpen && <EscalateModal state={state} dispatch={dispatch} />}
          {state.routing      && <RoutingTransition dispatch={dispatch} vendorKey={state.activeVendor} />}
        </div>
      </ChromeWindow>

      {/* Reset flow pill — anchor outside the chrome */}
      <button
        onClick={() => dispatch({ type: "reset-flow" })}
        title="Reset the demo to step 1"
        style={{
          position: "absolute", right: -14, top: 60,
          transform: "rotate(90deg)", transformOrigin: "right top",
          background: "var(--surface)", color: "var(--text-2)",
          border: "1px solid var(--border)",
          borderRadius: "999px 999px 0 0",
          padding: "5px 14px",
          fontFamily: "var(--font-mono)", fontSize: 10,
          letterSpacing: "0.18em", textTransform: "uppercase",
          cursor: "pointer", zIndex: 50,
        }}
      >
        ↻ Reset demo
      </button>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
