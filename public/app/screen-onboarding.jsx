// screen-onboarding.jsx — Vendor onboarding tier selection (6H / 24H / 48H SLA)
// Posts to POST /v1/vendors via the vite proxy. SLA tier → criticality tier
// mapping is: 6H Express → 1 (critical), 24H Standard → 2 (material), 48H Basic → 3 (informational).

const DEMO_BEARER_TOKEN = "demo_token_acme_corp_2026";

const OWNERS = [
  { id: "usr_priya",  name: "Priya Natarajan" },
  { id: "usr_marcus", name: "Marcus Chen" },
  { id: "usr_lin",    name: "Lin Park" },
  { id: "usr_jordan", name: "Jordan Wells" },
  { id: "usr_ada",    name: "Ada Owens" },
  { id: "usr_devon",  name: "Devon Rao" },
];

const DATA_CLASSES = [
  { id: "pii",       label: "PII" },
  { id: "phi",       label: "PHI" },
  { id: "financial", label: "Financial" },
  { id: "content",   label: "Content" },
];

const SLA_TO_CRITICALITY = { "6h": 1, "24h": 2, "48h": 3 };

function ScreenOnboarding({ state, dispatch }) {
  const [selected, setSelected]   = React.useState(state.onboardingTier || "24h");
  const [name, setName]           = React.useState("");
  const [homepage, setHomepage]   = React.useState("");
  const [ownerId, setOwnerId]     = React.useState("usr_priya");
  const [dataClasses, setDC]      = React.useState(["pii"]);
  const [submitting, setSubmit]   = React.useState(false);
  const [apiError, setApiError]   = React.useState(null);
  const [discovered, setDiscover] = React.useState(null);

  const tiers = [
    {
      id: "6h", role: "strawberry", sla: "6H", tagline: "Express",
      name: "6-Hour Express", price: "$999", unit: "/ vendor / month",
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
      id: "24h", role: "bondi", sla: "24H", tagline: "Standard",
      name: "24-Hour Standard", price: "$299", unit: "/ vendor / month",
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
      id: "48h", role: "lime", sla: "48H", tagline: "Basic",
      name: "48-Hour Basic", price: "$99", unit: "/ vendor / month",
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

  const currentTier = tiers.find((t) => t.id === selected) || tiers[1];

  function toggleDataClass(id) {
    setDC((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  async function submit() {
    setApiError(null);
    setDiscover(null);

    const trimmedName = name.trim();
    const trimmedHomepage = homepage.trim();
    if (trimmedName.length < 2) {
      setApiError({ code: "validation-failed", message: "Vendor name must be at least 2 characters." });
      return;
    }
    if (!/^https?:\/\//i.test(trimmedHomepage)) {
      setApiError({ code: "validation-failed", message: "Homepage must start with http:// or https://" });
      return;
    }

    setSubmit(true);
    try {
      const resp = await fetch("/v1/vendors", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + DEMO_BEARER_TOKEN,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: trimmedName,
          homepageUrl: trimmedHomepage,
          ownerId,
          tier: SLA_TO_CRITICALITY[selected],
          dataClasses,
        }),
      });

      const text = await resp.text();
      const json = text ? JSON.parse(text) : null;

      if (!resp.ok) {
        const err = (json && json.error) || { code: "unknown", message: "Request failed (HTTP " + resp.status + ")" };
        setApiError(err);
        if (err.code === "discovery-incomplete" && err.details) {
          setDiscover({ found: err.details.found || {}, missing: err.details.missing || [] });
        }
        setSubmit(false);
        return;
      }

      dispatch({
        type: "vendor-onboarded",
        tier: selected,
        tierLabel: currentTier.sla,
        name: json.name,
        vendorId: json.id,
        firstScanRunId: json.firstScanRunId,
        discoveredUrls: json.discoveredUrls,
      });
    } catch (e) {
      setApiError({ code: "network", message: e && e.message ? e.message : "Network error" });
      setSubmit(false);
    }
  }

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

        {apiError && (
          <div className={"onb-alert " + (apiError.code === "discovery-incomplete" ? "warn" : "err")}>
            <div className="onb-alert-head">
              <span className="onb-alert-code">{apiError.code}</span>
              <span>{apiError.message}</span>
            </div>
            {discovered && (
              <div className="onb-alert-detail">
                {discovered.missing.length > 0 && (
                  <div>
                    <span className="onb-alert-label">MISSING</span>
                    {discovered.missing.map((m) => (
                      <span key={m} className="onb-chip miss">{m}</span>
                    ))}
                  </div>
                )}
                {Object.keys(discovered.found).length > 0 && (
                  <div>
                    <span className="onb-alert-label">FOUND</span>
                    {Object.keys(discovered.found).map((k) => (
                      <span key={k} className="onb-chip ok">{k}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="onb-fields">
          <label className="onb-field">
            <span className="onb-field-label">VENDOR NAME</span>
            <input
              type="text"
              className="onb-input"
              placeholder="e.g. Datadog, Notion, Stripe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={submitting}
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
              disabled={submitting}
            />
          </label>
          <label className="onb-field">
            <span className="onb-field-label">OWNER</span>
            <select
              className="onb-input"
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value)}
              disabled={submitting}
            >
              {OWNERS.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </label>
          <div className="onb-field">
            <span className="onb-field-label">DATA CLASSES</span>
            <div className="onb-checkboxes">
              {DATA_CLASSES.map((dc) => {
                const on = dataClasses.includes(dc.id);
                return (
                  <button
                    key={dc.id}
                    type="button"
                    className={"onb-chip-btn" + (on ? " on" : "")}
                    onClick={() => toggleDataClass(dc.id)}
                    disabled={submitting}
                  >
                    {on ? "✓ " : ""}{dc.label}
                  </button>
                );
              })}
            </div>
          </div>
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
                onClick={() => !submitting && setSelected(t.id)}
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
              {currentTier.sla}
              <span className="onb-action-dot"> · </span>
              {currentTier.price}
              <span className="onb-action-unit"> {currentTier.unit}</span>
            </span>
          </div>
          <div className="onb-action-buttons">
            <button
              className="onb-btn ghost"
              onClick={goBack}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              className="onb-btn primary"
              onClick={submit}
              disabled={submitting}
            >
              {submitting
                ? <><span className="onb-spinner" /> Calling POST /v1/vendors…</>
                : <>Onboard at {currentTier.sla} SLA →</>}
            </button>
          </div>
        </div>

      </div>
    </main>
  );
}

Object.assign(window, { ScreenOnboarding });
