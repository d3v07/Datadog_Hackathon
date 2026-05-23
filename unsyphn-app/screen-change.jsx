// screen-change.jsx — Notion ChangeReport detail

function ScreenChange({ state, dispatch }) {
  const isRouted = state.notion === "ROUTED";

  return (
    <main className="main">
      <div className="cr-shell">

        {/* Crumbs */}
        <div className="crumbs-bar">
          <div className="crumbs">
            <span className="seg" onClick={() => dispatch({ type: "goto", screen: "portfolio" })}>Portfolio</span>
            <span className="sep">›</span>
            <span className="seg">Notion</span>
            <span className="sep">›</span>
            <span className="current">CR · RL·4839</span>
          </div>
          <div className="icon-btn-row">
            <button className="icon-btn" onClick={() => dispatch({ type: "goto", screen: "portfolio" })} title="Back">←</button>
            <button className="icon-btn" title="Forward">→</button>
            <button className="icon-btn" title="More">⋯</button>
          </div>
        </div>

        {/* Vendor strip */}
        <div className={"vendor-strip" + (isRouted ? " routed" : "")}>
          <div className="vendor-logo-lg">N</div>
          <div className="vendor-id-block">
            <div className="vendor-name-lg">Notion</div>
            <div className="vendor-meta-row">
              <span>DOCS · COLLAB</span>
              <span>TIER 1</span>
              <span>OWNER · <strong>Priya Natarajan</strong></span>
              <span>ANNUAL · <strong>$184,200</strong></span>
              <span>SEATS · <strong>847</strong></span>
            </div>
          </div>
          <div className="vendor-renew">
            <div className="num">42<small>d</small></div>
            <div className="lbl">Until renewal</div>
          </div>
        </div>

        <div className="cr-layout">

          {/* Report card */}
          <div className="report">
            <div className="report-head">
              {isRouted
                ? <div className="sev-badge routed">✓ ROUTED · WITNESSED</div>
                : <div className="sev-badge p1">⚠ P1 · CRITICAL</div>}
              <div className="cat-chip data">DATA</div>
              <div className="cat-chip pricing">PRICING</div>
            </div>
            <h1 className={"report-title" + (isRouted ? " routed" : "")}>
              {isRouted
                ? <>Routed to Legal. Negotiation packet <em>witnessed</em> and signed.</>
                : <>Data retention <em>shrinks</em> from 90 to 30 days. Per-seat pricing rises 18%.</>}
            </h1>
            <div className="report-detected">
              {isRouted
                ? <>ROUTED · <strong>2026-05-22 · 14:59 EST</strong> · <strong>just now</strong> · BY · agent-redline-v1.4 · GROUNDED · ✓ 4 citations · BUNDLE · <strong>RL·4839</strong></>
                : <>DETECTED · <strong>2026-05-22 · 14:42:18 EST</strong> · <strong>17 minutes ago</strong> · BY · agent-redline-v1.4 · GROUNDED · ✓ 4 citations validated</>}
            </div>

            {/* Impact strip */}
            <div className="impact-strip">
              <div className="impact-cell dollar">
                <div className="lbl">$ Impact · annual</div>
                <div className="val">+$28,400</div>
              </div>
              <div className="impact-cell delta">
                <div className="lbl">Per-seat change</div>
                <div className="val">+18% / 30d</div>
              </div>
              <div className="impact-cell compl">
                <div className="lbl">Compliance</div>
                <div className="val">GDPR · Art 5(1)e</div>
              </div>
            </div>

            {/* Diff 1 — Retention */}
            <div className="diff-block">
              <div className="diff-label">Change · §4.2 Data Retention</div>
              <div className="diff-pair">
                <div className="clause before">
                  <div className="clause-head">
                    <span className="clause-lbl">− BEFORE</span>
                    <span className="clause-when">SNAPSHOT · MAR 18 2026</span>
                  </div>
                  <p className="clause-text">
                    "Workspace owners may request export and deletion of all user content at any time.
                    Notion will retain backup copies for <strong>ninety (90) days</strong> following deletion,
                    after which content is permanently erased from all systems."
                  </p>
                  <div className="clause-source">SOURCE · notion.so/terms#4.2 · FETCHED 2026-03-18 09:14 UTC · HASH a3f9…d21c</div>
                </div>
                <div className="clause after">
                  <div className="clause-head">
                    <span className="clause-lbl">+ AFTER</span>
                    <span className="clause-when">SNAPSHOT · MAY 22 2026</span>
                  </div>
                  <p className="clause-text">
                    "Workspace owners may request export and deletion of all user content at any time.
                    Notion will retain backup copies for <strong>thirty (30) days</strong> following deletion,
                    after which content is permanently erased from all systems."
                  </p>
                  <div className="clause-source">SOURCE · <a href="#" onClick={(e)=>e.preventDefault()}>notion.so/terms#4.2</a> · FETCHED 2026-05-22 14:42 UTC · HASH 8b2e…f94a</div>
                </div>
              </div>
            </div>

            {/* Diff 2 — Pricing */}
            <div className="diff-block">
              <div className="diff-label">Change · §7.1 Plus Plan Pricing</div>
              <div className="diff-pair">
                <div className="clause before">
                  <div className="clause-head">
                    <span className="clause-lbl">− BEFORE</span>
                    <span className="clause-when">SNAPSHOT · MAR 18 2026</span>
                  </div>
                  <p className="clause-text">
                    "Plus plan: <strong>$10 per member per month</strong>, billed annually.
                    Includes unlimited blocks, file uploads up to 5 GB, and 30-day version history."
                  </p>
                  <div className="clause-source">SOURCE · notion.so/pricing · FETCHED 2026-03-18 09:14 UTC</div>
                </div>
                <div className="clause after">
                  <div className="clause-head">
                    <span className="clause-lbl">+ AFTER</span>
                    <span className="clause-when">SNAPSHOT · MAY 22 2026</span>
                  </div>
                  <p className="clause-text">
                    "Plus plan: <strong>$11.80 per member per month</strong>, billed annually.
                    Includes unlimited blocks, file uploads up to 5 GB, and 30-day version history."
                  </p>
                  <div className="clause-source">SOURCE · <a href="#" onClick={(e)=>e.preventDefault()}>notion.so/pricing</a> · FETCHED 2026-05-22 14:42 UTC</div>
                </div>
              </div>
            </div>

            {/* Recommendation */}
            <div className="recommendation">
              <div className="reco-head">{isRouted ? "Outcome · Routed" : "Recommendation"}</div>
              <p className="reco-text">
                {isRouted ? (
                  <>
                    Routed to <strong>Priya Natarajan</strong> (Legal) and <strong>Marcus Chen</strong> (Procurement). The
                    renegotiation packet has been <em>generated</em> and witnessed — see Bundle RL·4839.
                    4 actions dispatched: Slack DM, Jira PROC-2104, calendar invite for Jun 24, draft email
                    with three negotiation positions. Deadline: 2026-05-29.
                  </>
                ) : (
                  <>
                    Renewal is in <strong>42 days</strong>. The compounded retention shrinkage and price
                    increase are <em>both negotiable</em> at this stage. Generate the renegotiation packet
                    to push back on retention to 60d as a minimum (industry standard), and lock pricing at
                    the prior $10/seat for the renewal term. Estimated leverage: <strong>$28,400/yr saved</strong> on
                    price alone; retention recovery maps to <strong>SOC2 CC6.5</strong> and <strong>GDPR Art 5(1)e</strong>.
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Side panels */}
          <aside className="cr-side">

            <div className="panel policy">
              <div className="panel-head strawberry"><span className="dot" />Policy fired</div>
              <div className="policy-name">Price ↑ &gt;10% within 90d of renewal → P1 to Procurement</div>
              <pre className="policy-yaml">
{`# severity-rules.yaml`}
{"\n"}<span className="y-key">when:</span>{"\n  "}change.category: <span className="y-str">"pricing"</span>{"\n  "}change.dollarImpact.pct: <span className="y-str">">10"</span>{"\n  "}vendor.renewsAt: <span className="y-str">"within 90d"</span>{"\n"}<span className="y-key">then:</span>{"\n  "}severity: <span className="y-str">P1</span>{"\n  "}route:{"\n    - "}<span className="y-str">slack:@priya</span>{"\n    - "}<span className="y-str">jira:PROC</span>{"\n    - "}<span className="y-str">copilot:renegotiate</span>
              </pre>
              <div className="policy-meta">AUTHOR · Maya A. · GRC LEAD · v4 · 2026-04-12</div>
            </div>

            <div className="panel routing">
              <div className="panel-head bondi"><span className="dot" />Routed · {isRouted ? "4 actions sent" : "4 actions queued"}</div>
              <div className="action-item">
                <div className="action-icon slack">SL</div>
                <div className="action-detail">
                  <div className="action-target">DM · @priya</div>
                  <div className="action-when">{isRouted ? "14:59:02 · delivered" : "queued · awaits escalation"}</div>
                </div>
                <span className={"action-status" + (isRouted ? "" : " pending")}>{isRouted ? "SENT" : "QUEUED"}</span>
              </div>
              <div className="action-item">
                <div className="action-icon jira">JR</div>
                <div className="action-detail">
                  <div className="action-target">PROC-2104</div>
                  <div className="action-when">{isRouted ? "14:59:03 · assigned" : "queued"}</div>
                </div>
                <span className={"action-status" + (isRouted ? "" : " pending")}>{isRouted ? "SENT" : "QUEUED"}</span>
              </div>
              <div className="action-item">
                <div className="action-icon cal">CA</div>
                <div className="action-detail">
                  <div className="action-target">Renewal call · Jun 24</div>
                  <div className="action-when">{isRouted ? "14:59:04 · 4 invitees" : "queued"}</div>
                </div>
                <span className={"action-status" + (isRouted ? "" : " pending")}>{isRouted ? "SENT" : "QUEUED"}</span>
              </div>
              <div className="action-item">
                <div className="action-icon email">EM</div>
                <div className="action-detail">
                  <div className="action-target">Renego draft · ready</div>
                  <div className="action-when">{isRouted ? "14:59:05 · 3 versions" : "queued"}</div>
                </div>
                <span className={"action-status" + (isRouted ? "" : " pending")}>{isRouted ? "SENT" : "QUEUED"}</span>
              </div>
            </div>

            <div className="panel evidence" onClick={() => isRouted && dispatch({ type: "goto", screen: "evidence" })} style={{ cursor: isRouted ? "pointer" : "default" }}>
              <div className="panel-head grape"><span className="dot" />Evidence · {isRouted ? "Bundle RL·4839" : "Senso"}</div>
              <div className="ev-preview">
                <div className="ev-page-lines dark" />
                <div className="ev-page-lines" />
                <div className="ev-page-lines med" />
                <div className="ev-page-lines short" />
                <div className="ev-snippet">
                  <div className="line" />
                  <div className="line" />
                  <div className="line short" />
                </div>
                <div className="ev-page-lines" />
                <div className="ev-page-lines med" />
                <div className="ev-page-lines short" />
              </div>
              <div style={{ fontSize: 12, color: "var(--text)", fontWeight: 500, position: "relative" }}>
                {isRouted ? "Bundle RL·4839 · Witnessed" : "CR-2026-0517 · Draft"}
              </div>
              <div className="citation-row">
                <span className="cit-dot" />
                <span>4/4 CITATIONS · LIVE · IMMUTABLE</span>
              </div>
              {isRouted && (
                <div style={{ marginTop: 10, fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.10em", color: "var(--lime)", textTransform: "uppercase" }}>
                  ▸ OPEN BUNDLE
                </div>
              )}
            </div>

          </aside>
        </div>

      </div>

      {/* Sticky action bar */}
      <div className="actions-bar">
        {isRouted ? (
          <>
            <div className="actions-row">
              <button className="btn btn-bondi" onClick={() => dispatch({ type: "goto", screen: "evidence" })}>⊙ OPEN EVIDENCE BUNDLE</button>
              <button className="btn btn-ghost" onClick={() => dispatch({ type: "goto", screen: "portfolio" })}>← BACK TO PORTFOLIO</button>
            </div>
            <div className="actions-row">
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.14em", color: "var(--lime)", textTransform: "uppercase" }}>
                ✓ ROUTED · WITNESSED · {state.routeTime || "14:59:18 EST"}
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="actions-row">
              <button className="btn btn-primary">✓ ACKNOWLEDGE</button>
              <button className="btn btn-escalate" onClick={() => dispatch({ type: "open-escalate" })}>↑ ESCALATE TO LEGAL</button>
              <button className="btn btn-ghost">⏱ SNOOZE 48H</button>
            </div>
            <div className="actions-row">
              <button className="btn btn-ghost" onClick={() => dispatch({ type: "open-escalate" })}>⤓ GENERATE EVIDENCE BUNDLE</button>
              <button className="btn btn-ghost">⊙ OPEN RENEGO COPILOT</button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

Object.assign(window, { ScreenChange });
