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
    onboardingTier: "24h",
    onboardedToast: null,    // { name, tierLabel } | null
  });

  // ── dispatcher ───────────────────────────────────────
  function dispatch(action) {
    switch (action.type) {
      case "goto":
        setState((s) => ({ ...s, screen: action.screen }));
        // scroll the main column to top on screen change
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
        // close modal, show routing transition
        setState((s) => ({ ...s, escalateOpen: false, routing: true }));
        return;
      case "finish-routing":
        // mark notion routed, jump to evidence
        setState((s) => ({
          ...s,
          routing: false,
          notion: "ROUTED",
          routeTime: "14:59:18 EST",
          evidenceCount: 433,
          screen: "evidence",
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
        setTimeout(() => {
          setState((s) => ({ ...s, onboardedToast: null }));
        }, 5500);
        setTimeout(() => {
          const m = document.querySelector(".app-shell .main");
          if (m) m.scrollTo(0, 0);
        }, 0);
        return;
      default:
        globalThis["console"].warn("unknown action", action);
    }
  }

  // ── browser tabs ─────────────────────────────────────
  const url = state.screen === "portfolio"
    ? "app.unsyphn.com/portfolio"
    : state.screen === "change"
    ? "app.unsyphn.com/notion/RL-4839"
    : state.screen === "onboarding"
    ? "app.unsyphn.com/vendors/new"
    : "app.unsyphn.com/bundle/RL-4839";

  const tabs = [
    { title: "Unsyphn · Portfolio" },
    { title: "Notion · ToS" },
    { title: "DPA · Acme ⟷ Notion" },
  ];

  return (
    <div style={{ width: 1440, height: 900, position: "relative" }}>
      <ChromeWindow tabs={tabs} activeIndex={0} url={url} width={1440} height={900}>
        <div className="app-shell">
          <Sidebar
            active={
              state.screen === "evidence" ? "evidence"
              : state.screen === "change" ? "changes"
              : state.screen === "onboarding" ? "portfolio"
              : "portfolio"
            }
            dispatch={dispatch}
            state={state}
          />
          {state.screen === "portfolio"  && <ScreenPortfolio  state={state} dispatch={dispatch} />}
          {state.screen === "change"     && <ScreenChange     state={state} dispatch={dispatch} />}
          {state.screen === "evidence"   && <ScreenEvidence   state={state} dispatch={dispatch} />}
          {state.screen === "onboarding" && <ScreenOnboarding state={state} dispatch={dispatch} />}

          {state.escalateOpen && <EscalateModal state={state} dispatch={dispatch} />}
          {state.routing      && <RoutingTransition dispatch={dispatch} />}
        </div>
      </ChromeWindow>

      {state.onboardedToast && (
        <div className="onb-toast">
          <div className="onb-toast-icon">✓</div>
          <div>
            <div className="onb-toast-title">
              <strong>{state.onboardedToast.name}</strong> onboarded at <span className="onb-toast-sla">{state.onboardedToast.tierLabel}</span> SLA
            </div>
            <div className="onb-toast-sub">
              {state.onboardedToast.firstScanRunId
                ? <>First scan queued · run <code>{state.onboardedToast.firstScanRunId}</code></>
                : <>First scan queued · routing to owner</>}
            </div>
          </div>
        </div>
      )}

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
