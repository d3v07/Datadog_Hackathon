// shared.jsx — sidebar, topbar, scan strip, fleet stats, activity feed
// All consume `state` (read-only) and `dispatch` (navigation/mutations) from app.jsx.

function Sidebar({ active, dispatch, state }) {
  const screenMap = { portfolio: "portfolio", changes: "change", evidence: "evidence" };
  const [flashKey, setFlashKey] = React.useState(null);

  React.useEffect(() => {
    if (!document.getElementById("unsyphn-nav-flash-style")) {
      const s = document.createElement("style");
      s.id = "unsyphn-nav-flash-style";
      s.textContent = ".nav-item-flash { background: var(--surface-2, rgba(255,255,255,0.08)) !important; opacity: 0.6; transition: opacity 0.15s; }";
      document.head.appendChild(s);
    }
  }, []);

  const items = [
    { key: "portfolio",   label: "Portfolio",   count: "27",     section: "Workspace" },
    { key: "changes",     label: "Changes",     count: state.notion === "P1" ? "3 P1" : "2 P1", alert: state.notion === "P1", section: "Workspace" },
    { key: "renewals",    label: "Renewals",    count: "8",      section: "Workspace" },
    { key: "policies",    label: "Policies",    count: "14",     section: "Workspace" },
    { key: "evidence",    label: "Evidence",    count: state.evidenceCount || "432", section: "Workspace" },
    { key: "procurement", label: "Procurement", section: "Views" },
    { key: "legal",       label: "Legal Ops",   section: "Views" },
    { key: "grc",         label: "Security · GRC", section: "Views" },
    { key: "finance",     label: "Finance",     section: "Views" },
  ];
  let lastSection = null;
  return (
    <nav className="sidebar">
      <div className="brand-row">
        <UnsyphnMark size={24} />
      </div>
      {items.map((it) => {
        const sec = it.section !== lastSection ? (lastSection = it.section, it.section) : null;
        const hasScreen = screenMap[it.key] !== undefined;
        return (
          <React.Fragment key={it.key}>
            {sec && <div className="nav-section-label">{sec}</div>}
            <div
              className={
                "nav-item" +
                (it.key === active ? " is-active" : "") +
                (it.alert ? " alert" : "") +
                (flashKey === it.key ? " nav-item-flash" : "")
              }
              style={hasScreen ? undefined : { cursor: "not-allowed" }}
              onClick={() => {
                if (hasScreen) {
                  dispatch({ type: "goto", screen: screenMap[it.key] });
                } else {
                  setFlashKey(it.key);
                  setTimeout(() => setFlashKey(null), 600);
                }
              }}
            >
              <span>{it.label}</span>
              {it.count && <span className="count">{it.count}</span>}
            </div>
          </React.Fragment>
        );
      })}
      <div className="nav-spacer" />
      <div className="nav-org">
        <div className="org-name">Acme Holdings</div>
        <div className="org-meta">ENTERPRISE · US-EAST</div>
      </div>
    </nav>
  );
}

function TopBar({ title, when, right }) {
  return (
    <div className="topbar">
      <div className="topbar-left">
        <h1>{title}</h1>
        <div className="when">{when}</div>
      </div>
      <div className="topbar-right">
        {right}
        <div className="user-avatar">PN</div>
      </div>
    </div>
  );
}

function ScanStrip() {
  // Two copies for seamless tick loop
  const items = [
    { v: "Notion",  t: "terms.notion.so",        w: "scanning · 14:42:18", live: true },
    { v: "Stripe",  t: "stripe.com/dpa",          w: "scanning · 14:42:14", live: true },
    { v: "Datadog", t: "subprocessors.datadog",   w: "scanning · 14:42:09", live: true },
    { v: "Linear",  t: "linear.app/security",     w: "queued · next 30s" },
    { v: "AWS",     t: "aws.amazon.com/pricing",  w: "queued · next 60s" },
    { v: "Figma",   t: "figma.com/legal/sla",     w: "14:41:55 · no diff" },
    { v: "Vercel",  t: "vercel.com/legal/terms",  w: "14:41:42 · no diff" },
    { v: "Slack",   t: "slack.com/trust/security", w: "14:41:30 · diff" },
  ];
  const all = [...items, ...items];
  return (
    <div className="scan-strip">
      <div className="scan-strip-label"><span className="dot pulse live-dot" />LIVE</div>
      <div className="scan-track">
        {all.map((it, i) => (
          <div className="scan-item" key={i}>
            <span className="vendor">{it.v}</span>
            <span className="target">{it.t}</span>
            <span className="when">{it.w}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FleetStats({ state }) {
  const p1Count = state.notion === "P1" ? 3 : 2;
  const cards = [
    { role: "aqua",       lbl: "Vendors",        val: "27",  sub: "↑ 2 added this Q" },
    { role: "bondi",      lbl: "Scanning",       val: "8",   sub: "↑ live polling now" },
    { role: "tangerine",  lbl: "P2 · pending",   val: "5",   sub: "2 owners untouched 48h" },
    { role: "grape",      lbl: "Sub-proc Δ",     val: "11",  sub: "1 in non-adequate jurisd." },
    { role: "strawberry", lbl: "P1 · critical",  val: String(p1Count), sub: state.notion === "P1" ? "↑ $42k at risk" : "↓ $28k routed" },
    { role: "lime",       lbl: "Healthy",        val: "19",  sub: "no action needed" },
  ];
  return (
    <div className="fleet">
      {cards.map((c, i) => (
        <div className={"stat " + c.role} key={i}>
          <div className="stat-head">
            <span className="stat-label">{c.lbl}</span>
            <span className="stat-dot" />
          </div>
          <div className="stat-val">{c.val}</div>
          <div className="stat-sub">{c.sub}</div>
        </div>
      ))}
    </div>
  );
}

Object.assign(window, { Sidebar, TopBar, ScanStrip, FleetStats });
