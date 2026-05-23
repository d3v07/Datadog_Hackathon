// screen-evidence.jsx — Evidence bundle preview (the generated artifact)

function ScreenEvidence({ state, dispatch }) {
  return (
    <main className="main">
      <div className="bundle-shell">

        {/* Crumbs */}
        <div className="crumbs-bar">
          <div className="crumbs">
            <span className="seg" onClick={() => dispatch({ type: "goto", screen: "portfolio" })}>Portfolio</span>
            <span className="sep">›</span>
            <span className="seg" onClick={() => dispatch({ type: "goto", screen: "change" })}>Notion · RL·4839</span>
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
          <div className="seal-lg">US</div>
          <div className="id-block">
            <div className="ttl">Evidence Bundle · RL·4839</div>
            <div className="meta">
              <span>NOTION · CR · DATA + PRICING</span>
              <span>SIGNED · <strong>2026-05-22 · 14:59:08 EST</strong></span>
              <span>WITNESSED · <strong>agent-redline-v1.4</strong></span>
              <span>HASH · <strong>8b2e…f94a</strong></span>
              <span>4 CITATIONS · GROUNDED</span>
            </div>
          </div>
          <div className="stamp">✓ WITNESSED</div>
        </div>

        <div className="bundle-layout">

          {/* Document */}
          <div className="bundle-doc">

            <div className="bundle-cover">
              <div className="eb">⌁ Evidence Bond · No. RL·4839 ⌁</div>
              <h1>UNSYPHN</h1>
              <div className="sub">
                Notion · data retention &amp; pricing change · <em>witnessed</em>
              </div>
              <div className="meta-line">
                <span><b>ISSUED</b> · MAY 22 2026</span>
                <span><b>P1</b> · CRITICAL</span>
                <span><b>BUNDLE</b> · RL·4839</span>
                <span><b>WITNESS</b> · agent-redline-v1.4</span>
              </div>
            </div>

            {/* Section 1 — Diff */}
            <div className="bundle-section">
              <h3><span className="num">1</span>Clause diffs</h3>
              <div className="body">
                <p>Two clauses on terms.notion.so changed between snapshot <b>2026-03-18</b> and <b>2026-05-22</b>:</p>
                <div className="mini-diff">
                  <div className="mc b">
                    "…will retain backup copies for <strong>ninety (90) days</strong> following deletion…"
                    <div className="src">SOURCE · notion.so/terms#4.2 · 2026-03-18 · HASH a3f9…d21c</div>
                  </div>
                  <div className="mc a">
                    "…will retain backup copies for <strong>thirty (30) days</strong> following deletion…"
                    <div className="src">SOURCE · notion.so/terms#4.2 · 2026-05-22 · HASH 8b2e…f94a</div>
                  </div>
                </div>
                <div className="mini-diff">
                  <div className="mc b">
                    "Plus plan: <strong>$10 per member per month</strong>, billed annually."
                    <div className="src">SOURCE · notion.so/pricing · 2026-03-18</div>
                  </div>
                  <div className="mc a">
                    "Plus plan: <strong>$11.80 per member per month</strong>, billed annually."
                    <div className="src">SOURCE · notion.so/pricing · 2026-05-22</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2 — Policy */}
            <div className="bundle-section">
              <h3><span className="num">2</span>Policy fired</h3>
              <div className="body">
                <p>
                  <b>severity-rules.yaml v4</b> · "Price ↑ &gt;10% within 90d of renewal → P1 to Procurement."
                  Notion renewal is in <b>42 days</b>; per-seat change is <b>+18%</b>. The policy clause
                  matched at <b>2026-05-22 14:42:21 EST</b> and was queued for routing.
                </p>
              </div>
            </div>

            {/* Section 3 — Routing trail */}
            <div className="bundle-section">
              <h3><span className="num">3</span>Routing trail</h3>
              <div className="routing-trail">
                <div className="row"><span className="ts">14:59:01</span><span className="msg">Policy fired · <b>severity-rules.yaml v4</b></span><span className="ok">✓ MATCH</span></div>
                <div className="row"><span className="ts">14:59:02</span><span className="msg">Slack DM · <b>@priya</b> · delivered</span><span className="ok">✓ SENT</span></div>
                <div className="row"><span className="ts">14:59:03</span><span className="msg">Jira · <b>PROC-2104</b> · assigned Marcus Chen</span><span className="ok">✓ OPEN</span></div>
                <div className="row"><span className="ts">14:59:04</span><span className="msg">Calendar · <b>Jun 24 renewal call</b> · 4 invitees</span><span className="ok">✓ SCHED</span></div>
                <div className="row"><span className="ts">14:59:05</span><span className="msg">Drafts · <b>renegotiation packet</b> · 3 positions</span><span className="ok">✓ READY</span></div>
                <div className="row"><span className="ts">14:59:08</span><span className="msg">Bundle signed · hash <b>8b2e…f94a</b></span><span className="ok">✓ WITNESSED</span></div>
              </div>
            </div>

            {/* Section 4 — Citations */}
            <div className="bundle-section">
              <h3><span className="num">4</span>Citations · grounded</h3>
              <div className="cite-list">
                <div className="cite"><span className="ck">✓</span><span className="src">notion.so/terms#4.2 · §4.2 Data Retention · public</span><span className="hash">8b2e…f94a</span></div>
                <div className="cite"><span className="ck">✓</span><span className="src">notion.so/pricing · §7.1 Plus Plan · public</span><span className="hash">d4a1…2c7b</span></div>
                <div className="cite"><span className="ck">✓</span><span className="src">internal · DPA §3.1 (Acme ⟷ Notion) · private</span><span className="hash">f9c3…81de</span></div>
                <div className="cite"><span className="ck">✓</span><span className="src">policy · severity-rules.yaml v4 · internal</span><span className="hash">a3f9…d21c</span></div>
              </div>
            </div>

            {/* Sign-off */}
            <div className="signoff">
              <div className="left">
                — Witnessed by <b>agent-redline-v1.4</b><br/>
                2026-05-22 · 14:59:08 EST · grounded · routed · immutable
              </div>
              <div className="right">UNSYPHN</div>
            </div>

          </div>

          {/* Side: TOC + actions */}
          <aside className="cr-side">
            <div className="toc-card">
              <h4>Bundle contents · 4 sections</h4>
              <div className="toc-item"><span className="toc-num">1</span><span className="toc-ttl">Clause diffs</span><span className="toc-pages">2 pp.</span></div>
              <div className="toc-item"><span className="toc-num">2</span><span className="toc-ttl">Policy fired</span><span className="toc-pages">1 p.</span></div>
              <div className="toc-item"><span className="toc-num">3</span><span className="toc-ttl">Routing trail</span><span className="toc-pages">1 p.</span></div>
              <div className="toc-item"><span className="toc-num">4</span><span className="toc-ttl">Citations</span><span className="toc-pages">1 p.</span></div>
            </div>

            <div className="panel evidence" style={{ marginTop: 0 }}>
              <div className="panel-head lime"><span className="dot" />Witnessed</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-2)", lineHeight: 1.7, letterSpacing: "0.04em" }}>
                <div>BUNDLE · <b style={{color:"var(--text)"}}>RL·4839</b></div>
                <div>STATUS · <span style={{color:"var(--lime)"}}>SIGNED · GROUNDED</span></div>
                <div>WITNESS · agent-redline-v1.4</div>
                <div>HASH · 8b2e…f94a</div>
                <div>SIGNED · 2026-05-22 14:59:08</div>
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
              <div className="action-item">
                <div className="action-icon cal">CA</div>
                <div className="action-detail">
                  <div className="action-target">Renewal call</div>
                  <div className="action-when">Jun 24 · 14:00 EST</div>
                </div>
                <span className="action-status">SCHED</span>
              </div>
              <div className="action-item">
                <div className="action-icon email">EM</div>
                <div className="action-detail">
                  <div className="action-target">Send renego draft</div>
                  <div className="action-when">Owner · Priya N.</div>
                </div>
                <span className="action-status pending">DUE 5/29</span>
              </div>
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
