// screen-evidence.jsx — Evidence bundle preview (the generated artifact).
// Pulls bundle data from VENDOR_DATA[state.activeVendor].bundle.

function ScreenEvidence({ state, dispatch }) {
  const DATA = window.VENDOR_DATA || {};
  const vendor = DATA[state.activeVendor];

  // No bundle: bounce to the vendor's change screen.
  if (!vendor || !vendor.bundle) {
    return (
      <main className="main">
        <div style={{ padding: 40, color: "var(--text-2)" }}>
          No evidence bundle available for this vendor.{" "}
          <a href="#" onClick={(e) => { e.preventDefault(); dispatch({ type: "goto", screen: "change" }); }}>
            ← Back to change report
          </a>
        </div>
      </main>
    );
  }

  const b = vendor.bundle;
  const crCrumb = vendor.cr.bundleId ? `${vendor.name} · ${vendor.cr.bundleId}` : vendor.name;

  return (
    <main className="main">
      <div className="bundle-shell">

        {/* Crumbs */}
        <div className="crumbs-bar">
          <div className="crumbs">
            <span className="seg" onClick={() => dispatch({ type: "goto", screen: "portfolio" })}>Portfolio</span>
            <span className="sep">›</span>
            <span className="seg" onClick={() => dispatch({ type: "goto", screen: "change" })}>{crCrumb}</span>
            <span className="sep">›</span>
            <span className="current">Evidence Bundle</span>
          </div>
          <div className="icon-btn-row">
            <button className="icon-btn" onClick={() => dispatch({ type: "goto", screen: "change" })} title="Back">←</button>
            <button className="icon-btn" title="Forward">→</button>
            <button className="icon-btn" title="More">⋯</button>
          </div>
        </div>

        {/* Bundle header */}
        <div className="bundle-strip">
          <div className="seal-lg">{b.seal}</div>
          <div className="id-block">
            <div className="ttl">Evidence Bundle · {b.id}</div>
            <div className="meta">
              <span>{b.eyebrow}</span>
              <span>SIGNED · <strong>{b.signedAt}</strong></span>
              <span>WITNESSED · <strong>agent-redline-v1.4</strong></span>
              <span>HASH · <strong>{b.hash}</strong></span>
              <span>{(b.citations || []).length} CITATIONS · GROUNDED</span>
            </div>
          </div>
          <div className="stamp">✓ WITNESSED</div>
        </div>

        <div className="bundle-layout">

          {/* Document */}
          <div className="bundle-doc">

            <div className="bundle-cover">
              <div className="eb">⌁ Evidence Bond · No. {b.id} ⌁</div>
              <h1>UNSYPHN</h1>
              <div className="sub">
                {b.coverSubtitle}
              </div>
              <div className="meta-line">
                <span><b>ISSUED</b> · MAY 22 2026</span>
                <span><b>{vendor.sevLabel}</b> · {vendor.sev === "p1" ? "CRITICAL" : vendor.sev === "p2" ? "REVIEW" : "NOTE"}</span>
                <span><b>BUNDLE</b> · {b.id}</span>
                <span><b>WITNESS</b> · agent-redline-v1.4</span>
              </div>
            </div>

            {/* Section 1 — Diff */}
            <div className="bundle-section">
              <h3><span className="num">1</span>Clause diffs</h3>
              <div className="body">
                <p>
                  {(b.miniDiffs || []).length === 1
                    ? <>One clause on {vendor.name.toLowerCase()}'s monitored surfaces changed between snapshots:</>
                    : <>{(b.miniDiffs || []).length} clauses on {vendor.name.toLowerCase()}'s monitored surfaces changed between snapshots:</>}
                </p>
                {(b.miniDiffs || []).map((pair, i) => (
                  <div className="mini-diff" key={i}>
                    {pair.map((mc, j) => (
                      <div className={"mc " + mc.kind} key={j}>
                        {mc.text}
                        <div className="src">{mc.src}</div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Section 2 — Policy */}
            <div className="bundle-section">
              <h3><span className="num">2</span>Policy fired</h3>
              <div className="body">
                <p>{b.policyBody}</p>
              </div>
            </div>

            {/* Section 3 — Routing trail */}
            <div className="bundle-section">
              <h3><span className="num">3</span>Routing trail</h3>
              <div className="routing-trail">
                {(b.trail || []).map((r, i) => (
                  <div className="row" key={i}>
                    <span className="ts">{r.ts}</span>
                    <span className="msg">{r.msg}</span>
                    <span className="ok">{r.status}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 4 — Citations */}
            <div className="bundle-section">
              <h3><span className="num">4</span>Citations · grounded</h3>
              <div className="cite-list">
                {(b.citations || []).map((c, i) => (
                  <div className="cite" key={i}>
                    <span className="ck">✓</span>
                    <span className="src">{c.src}</span>
                    <span className="hash">{c.hash}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Sign-off */}
            <div className="signoff">
              <div className="left">
                — Witnessed by <b>agent-redline-v1.4</b><br/>
                {b.signedAt} · grounded · routed · immutable
              </div>
              <div className="right">UNSYPHN</div>
            </div>

          </div>

          {/* Side: TOC + actions */}
          <aside className="cr-side">
            <div className="toc-card">
              <h4>Bundle contents · {b.sectionCount || 4} sections</h4>
              <div className="toc-item"><span className="toc-num">1</span><span className="toc-ttl">Clause diffs</span><span className="toc-pages">{(b.miniDiffs || []).length || 1} pp.</span></div>
              <div className="toc-item"><span className="toc-num">2</span><span className="toc-ttl">Policy fired</span><span className="toc-pages">1 p.</span></div>
              <div className="toc-item"><span className="toc-num">3</span><span className="toc-ttl">Routing trail</span><span className="toc-pages">1 p.</span></div>
              <div className="toc-item"><span className="toc-num">4</span><span className="toc-ttl">Citations</span><span className="toc-pages">1 p.</span></div>
            </div>

            <div className="panel evidence" style={{ marginTop: 0 }}>
              <div className="panel-head lime"><span className="dot" />Witnessed</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-2)", lineHeight: 1.7, letterSpacing: "0.04em" }}>
                <div>BUNDLE · <b style={{color:"var(--text)"}}>{b.id}</b></div>
                <div>STATUS · <span style={{color:"var(--lime)"}}>SIGNED · GROUNDED</span></div>
                <div>WITNESS · agent-redline-v1.4</div>
                <div>HASH · {b.hash}</div>
                <div>SIGNED · {b.signedAt}</div>
                <div>IMMUTABLE · ✓</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>⤓ Download PDF</button>
                <button className="btn btn-ghost" style={{ width: "100%", justifyContent: "center" }}>✉ Share with audit</button>
                <button className="btn btn-ghost" style={{ width: "100%", justifyContent: "center" }}>⊙ Copy share link</button>
              </div>
            </div>

            <div className="panel routing" style={{ marginTop: 0 }}>
              <div className="panel-head bondi"><span className="dot" />Next · auto-routed</div>
              {(b.nextActions || []).map((a, i) => (
                <div className="action-item" key={i}>
                  <div className={"action-icon " + a.type}>{a.type.toUpperCase().slice(0, 2)}</div>
                  <div className="action-detail">
                    <div className="action-target">{a.target}</div>
                    <div className="action-when">{a.when}</div>
                  </div>
                  <span className={"action-status" + (a.pending ? " pending" : "")}>{a.status}</span>
                </div>
              ))}
            </div>
          </aside>

        </div>
      </div>

      {/* Action bar */}
      <div className="actions-bar">
        <div className="actions-row">
          <button className="btn btn-primary">⤓ DOWNLOAD BUNDLE (PDF)</button>
          <button className="btn btn-bondi">✉ SHARE WITH AUDIT</button>
          <button className="btn btn-ghost" onClick={() => dispatch({ type: "goto", screen: "change" })}>← BACK TO REPORT</button>
        </div>
        <div className="actions-row">
          <button className="btn btn-ghost" onClick={() => dispatch({ type: "goto", screen: "portfolio" })}>↩ PORTFOLIO</button>
        </div>
      </div>
    </main>
  );
}

Object.assign(window, { ScreenEvidence });
