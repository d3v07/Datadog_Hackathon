// screen-portfolio.jsx — Portfolio screen
// Reads every vendor from window.VENDOR_DATA. Every card is clickable —
// clicking jumps the change screen to that vendor's CR. Notion stays the
// hero flow (P1 → ROUTED via state.notion); other vendors carry their
// own pre-baked state.

function ScreenPortfolio({ state, dispatch }) {
  const notionState = state.notion; // "P1" | "ROUTED"
  const DATA = window.VENDOR_DATA || {};
  const ORDER = window.VENDOR_ORDER || Object.keys(DATA);

  // Build portfolio cards from VENDOR_DATA. Notion's display swaps on routed.
  const vendors = ORDER.map((k) => {
    const v = DATA[k];
    if (!v) return null;
    const isNotion = k === "notion";
    const routed = isNotion && notionState === "ROUTED";
    return {
      key: k,
      letter: v.letter,
      name: v.name,
      meta: v.meta,
      sev: routed ? "routed" : v.sev,
      sevLabel: routed ? "ROUTED" : v.sevLabel,
      lastChange: routed
        ? { label: "now · ROUTED TO LEGAL", cls: "live" }
        : v.lastChange,
      renews: { label: v.renewsLabel, cls: v.renewsCls },
      annual: v.annual,
      chips: v.dataClasses,
      owner: v.owner,
    };
  }).filter(Boolean);

  // Activity feed — pull from every vendor that has an `activity` entry.
  // The routed "just now" row sits on top of Notion's normal row when state.notion === ROUTED.
  const baseActivity = ORDER
    .map((k) => DATA[k])
    .filter((v) => v && v.activity)
    .map((v) => ({
      ...v.activity,
      v: v.name,
      key: v.key,
      clickable: true,
    }));

  // Slack as a P3 footer row — passive entry only (no full CR view).
  baseActivity.push({
    sev: "p3", v: "Slack", w: "1d",
    title: "SOC2 Type II refreshed · 2026 report",
    meta: "SECURITY", impact: "CLEARED", impactCls: "out",
    clickable: false,
  });

  const activity = notionState === "ROUTED"
    ? [
        { sev: "routed", v: "Notion", w: "just now",
          title: "ROUTED to Priya N. · Bundle RL·4839 generated",
          meta: "ESCALATED · LEGAL", impact: "WITNESSED", impactCls: "out",
          key: "notion", clickable: true, gotoBundle: true },
        ...baseActivity,
      ]
    : baseActivity;

  const openVendor = (key) => dispatch({ type: "open-vendor", vendor: key });
  const openBundle = (key) => dispatch({ type: "open-vendor-bundle", vendor: key });

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
            {vendors.map((v) => (
              <div
                className={"vendor " + v.sev}
                key={v.key}
                onClick={() => openVendor(v.key)}
                style={{ cursor: "pointer" }}
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
              onClick={a.clickable
                ? (a.gotoBundle ? () => openBundle(a.key) : () => openVendor(a.key))
                : undefined}
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
