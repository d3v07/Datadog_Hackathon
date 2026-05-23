// screen-onboarding.jsx — Vendor onboarding tier selection (6H / 24H / 48H SLA)

function ScreenOnboarding({ state, dispatch }) {
  const [selected, setSelected] = React.useState(state.onboardingTier || "24h");
  const [name, setName] = React.useState("");
  const [homepage, setHomepage] = React.useState("");

  const tiers = [
    {
      id: "6h",
      role: "strawberry",
      sla: "6H",
      tagline: "Express",
      name: "6-Hour Express",
      price: "$999",
      unit: "/ vendor / month",
      desc: "For Tier-1, revenue-critical vendors. Sub-six-hour detection on every ToS, DPA, or sub-processor change.",
      features: [
        "6-hour SLA on change detection",
        "Hourly diff scans, 24 / 7 / 365",
        "Dedicated #redline-p1 escalation channel",
        "Auto-route to on-call within 90 seconds",
        "Compliance bundle on every change",
        "Quarterly auditor walkthrough",
      ],
      eta: "FIRST SCAN IN ~6 MIN",
    },
    {
      id: "24h",
      role: "bondi",
      sla: "24H",
      tagline: "Standard",
      name: "24-Hour Standard",
      price: "$299",
      unit: "/ vendor / month",
      desc: "The right default for most vendors. Daily monitoring with automated routing to owners.",
      features: [
        "24-hour SLA on change detection",
        "Daily automated diff scans",
        "Slack + email routing to owner",
        "Quarterly evidence bundles",
        "Standard 9-5 support",
        "Vanta / Drata push every 90d",
      ],
      eta: "FIRST SCAN IN ~30 MIN",
      recommended: true,
    },
    {
      id: "48h",
      role: "lime",
      sla: "48H",
      tagline: "Basic",
      name: "48-Hour Basic",
      price: "$99",
      unit: "/ vendor / month",
      desc: "Lightweight coverage for low-priority and long-tail vendors. Routine checks, weekly digests.",
      features: [
        "48-hour SLA on change detection",
        "Bi-daily routine scans",
        "Weekly digest email to owner",
        "Self-serve evidence export",
        "Community support",
        "Manual escalation only",
      ],
      eta: "FIRST SCAN IN ~2 HRS",
    },
  ];

  const goBack = () => dispatch({ type: "goto", screen: "portfolio" });
  const confirm = () => {
    const tier = tiers.find((t) => t.id === selected);
    dispatch({
      type: "vendor-onboarded",
      tier: selected,
      tierLabel: tier ? tier.sla : "24H",
      name: name.trim() || "New Vendor",
      homepage: homepage.trim(),
    });
  };

  return (
    <main className="main">
      <div className="cr-shell">

        <div className="crumbs-bar">
          <div className="crumbs">
            <span className="seg" onClick={goBack}>Portfolio</span>
            <span className="sep">›</span>
            <span className="current">Onboard vendor</span>
          </div>
          <div className="icon-btn-row">
            <button className="icon-btn" onClick={goBack} title="Back to dashboard">←</button>
            <button className="icon-btn" title="More">⋯</button>
          </div>
        </div>

        <div className="onb-header">
          <div className="onb-header-left">
            <div className="eyebrow">STEP 1 OF 1 · CHOOSE SLA</div>
            <h1 className="h1-hero onb-title">
              Onboard a new <em className="accent-italic">vendor</em>.
            </h1>
            <p className="lead onb-sub">
              Pick the detection SLA that matches the vendor&apos;s risk profile. You can re-tier any vendor later from the portfolio &mdash; this only changes scan cadence and routing.
            </p>
          </div>
          <button className="btn-back-pill" onClick={goBack}>← Back to dashboard</button>
        </div>

        <div className="onb-fields">
          <label className="onb-field">
            <span className="onb-field-label">VENDOR NAME</span>
            <input
              type="text"
              className="onb-input"
              placeholder="e.g. Datadog, Notion, Stripe"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="onb-field">
            <span className="onb-field-label">HOMEPAGE URL</span>
            <input
              type="url"
              className="onb-input"
              placeholder="https://vendor.com"
              value={homepage}
              onChange={(e) => setHomepage(e.target.value)}
            />
          </label>
        </div>

        <div className="tier-grid">
          {tiers.map((t) => {
            const isSel = selected === t.id;
            return (
              <div
                key={t.id}
                className={
                  "tier-card " + t.role +
                  (isSel ? " is-selected" : "") +
                  (t.recommended ? " is-recommended" : "")
                }
                onClick={() => setSelected(t.id)}
              >
                {t.recommended && <div className="tier-badge">RECOMMENDED</div>}

                <div className="tier-head">
                  <div className="tier-sla">{t.sla}</div>
                  <div className="tier-tagline">{t.tagline}</div>
                </div>

                <h2 className="h2 tier-name">{t.name}</h2>
                <p className="tier-desc">{t.desc}</p>

                <div className="tier-price-row">
                  <span className="tier-price">{t.price}</span>
                  <span className="tier-unit">{t.unit}</span>
                </div>

                <ul className="tier-features">
                  {t.features.map((f, i) => (
                    <li key={i}><span className="tier-check">✓</span>{f}</li>
                  ))}
                </ul>

                <div className="tier-foot">
                  <div className="tier-eta">{t.eta}</div>
                  <div className={"tier-select-pill" + (isSel ? " on" : "")}>
                    {isSel ? "✓ SELECTED" : "SELECT"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="onb-action-bar">
          <div className="onb-action-summary">
            <span className="onb-action-label">SELECTED TIER</span>
            <span className="onb-action-value">
              {(tiers.find((t) => t.id === selected) || tiers[1]).sla}
              <span className="onb-action-dot"> · </span>
              {(tiers.find((t) => t.id === selected) || tiers[1]).price}
              <span className="onb-action-unit"> {(tiers.find((t) => t.id === selected) || tiers[1]).unit}</span>
            </span>
          </div>
          <div className="onb-action-buttons">
            <button className="onb-btn ghost" onClick={goBack}>Cancel</button>
            <button className="onb-btn primary" onClick={confirm}>
              Onboard at {(tiers.find((t) => t.id === selected) || tiers[1]).sla} SLA →
            </button>
          </div>
        </div>

      </div>
    </main>
  );
}

Object.assign(window, { ScreenOnboarding });
