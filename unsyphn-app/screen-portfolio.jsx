// screen-portfolio.jsx — Portfolio screen

function ScreenPortfolio({ state, dispatch }) {
  const notionState = state.notion; // "P1" | "ROUTED"

  // The Notion card is the focus of the flow — clicking opens ChangeReport.
  const vendors = [
    {
      key: "notion",
      letter: "N", name: "Notion", meta: "DOCS · TIER 1",
      sev: notionState === "P1" ? "p1" : "routed",
      sevLabel: notionState === "P1" ? "P1" : "ROUTED",
      lastChange: notionState === "P1"
        ? { label: "17m ago · DATA · PRICING", cls: "crit" }
        : { label: "now · ROUTED TO LEGAL", cls: "live" },
      renews: { label: "42 DAYS", cls: "warn" },
      annual: "$184,200",
      chips: ["pii", "source"],
      owner: { cls: "b", initials: "PN" },
      clickable: true,
    },
    {
      letter: "D", name: "Datadog", meta: "OBSERVABILITY · TIER 1",
      sev: "p1", sevLabel: "P1",
      lastChange: { label: "2h ago · SUB-PROC", cls: "crit" },
      renews: { label: "11 DAYS", cls: "warn" },
      annual: "$420,000",
      chips: ["pii", "phi"],
      owner: { cls: "a", initials: "RK" },
    },
    {
      letter: "S", name: "Stripe", meta: "PAYMENTS · TIER 1",
      sev: "p2", sevLabel: "P2",
      lastChange: { label: "6h ago · TERMS" },
      renews: { label: "8 MONTHS" },
      annual: "$2.4M",
      chips: ["pii", "payments"],
      owner: { cls: "c", initials: "MA" },
    },
    {
      letter: "A", name: "AWS", meta: "INFRA · TIER 1",
      sev: "p2", sevLabel: "P2",
      lastChange: { label: "1d ago · PRICING" },
      renews: { label: "3 MONTHS" },
      annual: "$1.8M",
      chips: ["pii", "source"],
      owner: { cls: "a", initials: "RK" },
    },
    {
      letter: "L", name: "Linear", meta: "PROJECT · TIER 2",
      sev: "healthy", sevLabel: "OK",
      lastChange: { label: "14 days · no diff" },
      renews: { label: "5 MONTHS" },
      annual: "$48,000",
      chips: ["pii"],
      owner: { cls: "d", initials: "JT" },
    },
    {
      letter: "F", name: "Figma", meta: "DESIGN · TIER 2",
      sev: "healthy", sevLabel: "OK",
      lastChange: { label: "22 days · no diff" },
      renews: { label: "7 MONTHS" },
      annual: "$96,000",
      chips: ["pii"],
      owner: { cls: "d", initials: "JT" },
    },
  ];

  const activity = notionState === "P1"
    ? [
        { sev: "p1", v: "Notion", w: "17m", title: "Data retention shrinks 90→30d, per-seat +18%", meta: "DATA · PRICING", impact: "+$28.4k/yr", impactCls: "in", clickable: true },
        { sev: "p1", v: "Datadog", w: "2h", title: "Sub-processor added · Tencent Cloud · CN", meta: "SUB-PROC · JURISDICTION", impact: "+30d NOTICE", impactCls: "" },
        { sev: "p2", v: "Stripe", w: "6h", title: "Liability cap reduced from $1M to $500k", meta: "TERMS · LIABILITY", impact: "LEGAL REVIEW", impactCls: "" },
        { sev: "p2", v: "AWS", w: "1d", title: "EC2 g6.xlarge +8% in us-east-1", meta: "PRICING", impact: "+$14.2k/yr", impactCls: "in" },
        { sev: "p3", v: "Slack", w: "1d", title: "SOC2 Type II refreshed · 2026 report", meta: "SECURITY", impact: "CLEARED", impactCls: "out" },
      ]
    : [
        { sev: "routed", v: "Notion", w: "just now", title: "ROUTED to Priya N. · Bundle RL·4839 generated", meta: "ESCALATED · LEGAL", impact: "WITNESSED", impactCls: "out", clickable: true, gotoBundle: true },
        { sev: "p1", v: "Notion", w: "17m", title: "Data retention shrinks 90→30d, per-seat +18%", meta: "DATA · PRICING", impact: "+$28.4k/yr", impactCls: "in", clickable: true },
        { sev: "p1", v: "Datadog", w: "2h", title: "Sub-processor added · Tencent Cloud · CN", meta: "SUB-PROC · JURISDICTION", impact: "+30d NOTICE", impactCls: "" },
        { sev: "p2", v: "Stripe", w: "6h", title: "Liability cap reduced from $1M to $500k", meta: "TERMS · LIABILITY", impact: "LEGAL REVIEW", impactCls: "" },
        { sev: "p3", v: "Slack", w: "1d", title: "SOC2 Type II refreshed · 2026 report", meta: "SECURITY", impact: "CLEARED", impactCls: "out" },
      ];

  const openNotionCR = () => dispatch({ type: "goto", screen: "change" });
  const openBundle = () => dispatch({ type: "goto", screen: "evidence" });

  return (
    <main className="main">
      <TopBar
        title="Portfolio"
        when="FRIDAY · MAY 22 2026 · 14:42 EST"
        right={
          <>
            <div className="scan-pill"><span className="dot" />8 SCANNING NOW</div>
            <div className={"scan-pill" + (notionState === "P1" ? " alert" : "")}>
              {notionState === "P1" ? "3 P1 ACTIVE" : "2 P1 ACTIVE · 1 ROUTED"}
            </div>
          </>
        }
      />

      <ScanStrip />
      <FleetStats state={state} />

      <div className="portfolio-grid">
        <div>
          <div className="sec-head">
            <h2 className="sec-title">The <em>fleet</em></h2>
            <span className="sec-action">VIEW ALL 27 →</span>
          </div>
          <div className="vendors">
            {vendors.map((v, i) => (
              <div
                className={"vendor " + v.sev}
                key={i}
                onClick={v.key === "notion" ? openNotionCR : undefined}
                style={v.key === "notion" ? { cursor: "pointer" } : { cursor: "default" }}
              >
                <div className="vendor-head">
                  <div className="vendor-id">
                    <div className="vendor-logo">{v.letter}</div>
                    <div>
                      <div className="vendor-name">{v.name}</div>
                      <div className="vendor-meta">{v.meta}</div>
                    </div>
                  </div>
                  <div className={"sev " + v.sev}>{v.sevLabel}</div>
                </div>
                <div className="vendor-row">
                  <span className="lbl">Last change</span>
                  <span className={"val " + (v.lastChange.cls || "")}>{v.lastChange.label}</span>
                </div>
                <div className="vendor-row">
                  <span className="lbl">Renews</span>
                  <span className={"val " + (v.renews.cls || "")}>{v.renews.label}</span>
                </div>
                <div className="vendor-row">
                  <span className="lbl">Annual</span>
                  <span className="val">{v.annual}</span>
                </div>
                <div className="vendor-tags">
                  {v.chips.map((c) => <span className={"chip " + c} key={c}>{c}</span>)}
                  <div className={"owner-av " + v.owner.cls}>{v.owner.initials}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="activity">
          <div className="activity-head">
            <span className="title">Recent activity</span>
            <span className="filter">ALL · LAST 48H</span>
          </div>
          {activity.map((a, i) => (
            <div
              className="activity-item"
              key={i}
              onClick={a.clickable ? (a.gotoBundle ? openBundle : openNotionCR) : undefined}
              style={a.clickable ? { cursor: "pointer" } : undefined}
            >
              <div className="activity-row">
                <span className={"activity-sev " + a.sev}>{a.sev === "routed" ? "✓" : a.sev.toUpperCase()}</span>
                <span className="activity-vendor">{a.v}</span>
                <span className="activity-when">{a.w}</span>
              </div>
              <div className="activity-title">{a.title}</div>
              <div className="activity-meta">
                <span>{a.meta}</span>
                <span className={"impact " + a.impactCls}>{a.impact}</span>
              </div>
            </div>
          ))}
        </aside>
      </div>
    </main>
  );
}

Object.assign(window, { ScreenPortfolio });
