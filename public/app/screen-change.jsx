// screen-change.jsx — ChangeReport detail screen.
// Reads window.VENDOR_DATA[state.activeVendor]. Notion is the interactive
// hero flow (P1 → ROUTED via state.notion); other vendors are pre-baked
// in one of: open (P1/P2 unrouted), acknowledged (P1 already routed),
// healthy (no recent diff).

function ScreenChange({ state, dispatch }) {
  const DATA = window.VENDOR_DATA || {};
  const vendor = DATA[state.activeVendor];

  // Defensive: missing vendor → bounce back to portfolio. Shouldn't happen
  // in normal navigation, only if someone deep-links a bad key.
  if (!vendor) {
    return (
      <main className="main">
        <div style={{ padding: 40, color: "var(--text-2)" }}>
          Vendor not found.{" "}
          <a href="#" onClick={(e) => { e.preventDefault(); dispatch({ type: "goto", screen: "portfolio" }); }}>
            ← Back to portfolio
          </a>
        </div>
      </main>
    );
  }

  // Notion's mode is dynamic (escalation flow); other vendors carry their own.
  const isNotion = vendor.key === "notion";
  const mode = isNotion
    ? (state.notion === "ROUTED" ? "routed" : "open")
    : (vendor.mode || "open");
  const isRouted = mode === "routed";
  const isAck = mode === "acknowledged";
  const isHealthy = mode === "healthy";
  const isWitnessed = isRouted || isAck;

  const cr = vendor.cr || {};

  // Severity badge: routed for notion-routed, "ACK" for acknowledged,
  // otherwise the vendor's sev.
  const sevBadgeCls = isRouted ? "routed" : isAck ? "ack" : isHealthy ? "healthy" : vendor.sev;
  const sevBadgeText = isRouted ? "✓ ROUTED · WITNESSED"
    : isAck ? "✓ ACKNOWLEDGED · WITNESSED"
    : isHealthy ? "✓ HEALTHY"
    : `⚠ ${vendor.sevLabel} · ${vendor.sevLabel === "P1" ? "CRITICAL" : vendor.sevLabel === "P2" ? "REVIEW" : "NOTE"}`;

  const ownerName = vendor.owner.name;
  const crumbCurrent = cr.bundleId ? `CR · ${cr.bundleId}` : "CR · scan";

  return (
    <main className="main">
      <div className="cr-shell">

        {/* Crumbs */}
        <div className="crumbs-bar">
          <div className="crumbs">
            <span className="seg" onClick={() => dispatch({ type: "goto", screen: "portfolio" })}>Portfolio</span>
            <span className="sep">›</span>
            <span className="seg">{vendor.name}</span>
            <span className="sep">›</span>
            <span className="current">{crumbCurrent}</span>
          </div>
          <div className="icon-btn-row">
            <button className="icon-btn" onClick={() => dispatch({ type: "goto", screen: "portfolio" })} title="Back">←</button>
            <button className="icon-btn" title="Forward">→</button>
            <button className="icon-btn" title="More">⋯</button>
          </div>
        </div>

        {/* Vendor strip */}
        <div className={"vendor-strip" + (isWitnessed ? " routed" : "")}>
          <div className="vendor-logo-lg">{vendor.letter}</div>
          <div className="vendor-id-block">
            <div className="vendor-name-lg">{vendor.name}</div>
            <div className="vendor-meta-row">
              <span>{vendor.category}</span>
              <span>TIER {vendor.tier}</span>
              <span>OWNER · <strong>{ownerName}</strong></span>
              <span>ANNUAL · <strong>{vendor.annual}</strong></span>
              {vendor.seats > 0 && <span>SEATS · <strong>{vendor.seats}</strong></span>}
            </div>
          </div>
          <div className="vendor-renew">
            <div className="num">{vendor.renewsInDays}<small>d</small></div>
            <div className="lbl">Until renewal</div>
          </div>
        </div>

        <div className="cr-layout">

          {/* Report card */}
          <div className="report">
            <div className="report-head">
              <div className={"sev-badge " + sevBadgeCls}>{sevBadgeText}</div>
              {(cr.categories || []).map((c) => (
                <div className={"cat-chip " + c.toLowerCase().replace(/[^a-z]/g, "")} key={c}>{c}</div>
              ))}
            </div>
            <h1 className={"report-title" + (isRouted ? " routed" : "")}>
              {isRouted && cr.titleRouted ? cr.titleRouted : cr.titleOpen}
            </h1>
            <div className="report-detected">
              {isRouted ? (
                <>ROUTED · <strong>{cr.routedAt}</strong> · <strong>{cr.routedWhen}</strong> · BY · {cr.agent} · GROUNDED · ✓ {cr.citationCount} citations · BUNDLE · <strong>{cr.bundleId}</strong></>
              ) : isAck ? (
                <>ACKNOWLEDGED · <strong>{cr.acknowledgedAt}</strong> · <strong>{cr.acknowledgedWhen}</strong> · BY · {cr.agent} · GROUNDED · ✓ {cr.citationCount} citations · BUNDLE · <strong>{cr.bundleId}</strong></>
              ) : isHealthy ? (
                <>LAST SCAN · <strong>{cr.detectedAt}</strong> · <strong>{cr.detectedWhen}</strong> · BY · {cr.agent} · NO DIFF DETECTED</>
              ) : (
                <>DETECTED · <strong>{cr.detectedAt}</strong> · <strong>{cr.detectedWhen}</strong> · BY · {cr.agent} · GROUNDED · ✓ {cr.citationCount} citations validated</>
              )}
            </div>

            {/* Impact strip — only when there's an impact to show */}
            {Array.isArray(cr.impacts) && cr.impacts.length > 0 && (
              <div className="impact-strip">
                {cr.impacts.map((imp, i) => (
                  <div className={"impact-cell " + imp.cls} key={i}>
                    <div className="lbl">{imp.lbl}</div>
                    <div className="val">{imp.val}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Diff blocks — one block per material clause change */}
            {Array.isArray(cr.diffs) && cr.diffs.map((d, i) => (
              <div className="diff-block" key={i}>
                <div className="diff-label">{d.label}</div>
                <div className="diff-pair">
                  <div className="clause before">
                    <div className="clause-head">
                      <span className="clause-lbl">− BEFORE</span>
                      <span className="clause-when">{d.before.when}</span>
                    </div>
                    <p className="clause-text">{d.before.text}</p>
                    <div className="clause-source">{d.before.source}</div>
                  </div>
                  <div className="clause after">
                    <div className="clause-head">
                      <span className="clause-lbl">+ AFTER</span>
                      <span className="clause-when">{d.after.when}</span>
                    </div>
                    <p className="clause-text">{d.after.text}</p>
                    <div className="clause-source">
                      SOURCE · <a href="#" onClick={(e) => e.preventDefault()}>{d.after.sourceLink}</a>{d.after.sourceMeta}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Healthy mode — show scanned-surfaces panel instead of diffs */}
            {isHealthy && Array.isArray(cr.lastScannedSurfaces) && (
              <div className="diff-block">
                <div className="diff-label">Monitored surfaces · all stable</div>
                <div className="clause after" style={{ width: "100%" }}>
                  <div className="clause-head">
                    <span className="clause-lbl">✓ STABLE</span>
                    <span className="clause-when">LAST 14d</span>
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-2)", lineHeight: 1.9 }}>
                    {cr.lastScannedSurfaces.map((s, i) => (
                      <div key={i} style={{ display: "flex", gap: 16 }}>
                        <span style={{ color: "var(--lime)" }}>✓</span>
                        <span style={{ flex: 1 }}>{s.url}</span>
                        <span style={{ opacity: 0.6 }}>{s.when}</span>
                        <span style={{ color: "var(--text-2)" }}>{s.hash}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Recommendation */}
            <div className="recommendation">
              <div className="reco-head">
                {isRouted && cr.recoRouted ? cr.recoRouted.head
                  : isAck && cr.recoRouted ? cr.recoRouted.head
                  : cr.recoOpen && cr.recoOpen.head}
              </div>
              <p className="reco-text">
                {isRouted && cr.recoRouted ? cr.recoRouted.text
                  : isAck && cr.recoRouted ? cr.recoRouted.text
                  : cr.recoOpen && cr.recoOpen.text}
              </p>
            </div>
          </div>

          {/* Side panels */}
          <aside className="cr-side">

            {/* Policy panel — skipped on healthy vendors */}
            {!isHealthy && cr.policy && (
              <div className="panel policy">
                <div className="panel-head strawberry"><span className="dot" />{cr.policy.head}</div>
                <div className="policy-name">{cr.policy.name}</div>
                {(window.POLICY_YAML || {})[cr.policy.yamlKey] || null}
                <div className="policy-meta">{cr.policy.meta}</div>
              </div>
            )}

            {/* Routing panel — skipped on healthy vendors */}
            {!isHealthy && Array.isArray(cr.actions) && cr.actions.length > 0 && (
              <div className="panel routing">
                <div className="panel-head bondi">
                  <span className="dot" />
                  Routed · {isWitnessed ? `${cr.actions.length} actions sent` : `${cr.actions.length} actions queued`}
                </div>
                {cr.actions.map((a, i) => (
                  <div className="action-item" key={i}>
                    <div className={"action-icon " + a.type}>{a.type.toUpperCase().slice(0, 2)}</div>
                    <div className="action-detail">
                      <div className="action-target">{a.target}</div>
                      <div className="action-when">{isWitnessed ? a.sent : a.queued}</div>
                    </div>
                    <span className={"action-status" + (isWitnessed ? "" : " pending")}>
                      {isWitnessed ? "SENT" : "QUEUED"}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Evidence panel — links to bundle when one exists */}
            {vendor.bundle ? (
              <div
                className="panel evidence"
                onClick={() => dispatch({ type: "open-vendor-bundle", vendor: vendor.key })}
                style={{ cursor: "pointer" }}
              >
                <div className="panel-head grape"><span className="dot" />Evidence · Bundle {vendor.bundle.id}</div>
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
                  Bundle {vendor.bundle.id} · Witnessed
                </div>
                <div className="citation-row">
                  <span className="cit-dot" />
                  <span>{cr.citationCount}/{cr.citationCount} CITATIONS · LIVE · IMMUTABLE</span>
                </div>
                <div style={{ marginTop: 10, fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.10em", color: "var(--lime)", textTransform: "uppercase" }}>
                  ▸ OPEN BUNDLE
                </div>
              </div>
            ) : isNotion ? (
              <div className="panel evidence">
                <div className="panel-head grape"><span className="dot" />Evidence · Senso</div>
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
                  CR-2026-0517 · Draft
                </div>
                <div className="citation-row">
                  <span className="cit-dot" />
                  <span>{cr.citationCount}/{cr.citationCount} CITATIONS · LIVE · IMMUTABLE</span>
                </div>
              </div>
            ) : isHealthy ? (
              <div className="panel evidence">
                <div className="panel-head lime"><span className="dot" />Posture · stable</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-2)", lineHeight: 1.8, letterSpacing: "0.04em" }}>
                  <div>SURFACES · <b style={{ color: "var(--text)" }}>{cr.lastScannedSurfaces?.length || 0}</b></div>
                  <div>DIFF · <span style={{ color: "var(--lime)" }}>NONE</span></div>
                  <div>RISK · <span style={{ color: "var(--lime)" }}>LOW</span></div>
                  <div>NEXT SCAN · {cr.detectedAt}</div>
                </div>
              </div>
            ) : (
              <div className="panel evidence">
                <div className="panel-head grape"><span className="dot" />Evidence · pending review</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-2)", lineHeight: 1.7 }}>
                  Bundle generated on acknowledgement. {cr.citationCount} citations queued.
                </div>
              </div>
            )}

          </aside>
        </div>

      </div>

      {/* Sticky action bar */}
      <div className="actions-bar">
        {isRouted ? (
          <>
            <div className="actions-row">
              <button className="btn btn-bondi" onClick={() => dispatch({ type: "open-vendor-bundle", vendor: vendor.key })}>⊙ OPEN EVIDENCE BUNDLE</button>
              <button className="btn btn-ghost" onClick={() => dispatch({ type: "goto", screen: "portfolio" })}>← BACK TO PORTFOLIO</button>
            </div>
            <div className="actions-row">
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.14em", color: "var(--lime)", textTransform: "uppercase" }}>
                ✓ ROUTED · WITNESSED · {state.routeTime || "14:59:18 EST"}
              </span>
            </div>
          </>
        ) : isAck ? (
          <>
            <div className="actions-row">
              <button className="btn btn-bondi" onClick={() => dispatch({ type: "open-vendor-bundle", vendor: vendor.key })}>⊙ OPEN EVIDENCE BUNDLE</button>
              <button className="btn btn-ghost" onClick={() => dispatch({ type: "goto", screen: "portfolio" })}>← BACK TO PORTFOLIO</button>
            </div>
            <div className="actions-row">
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.14em", color: "var(--lime)", textTransform: "uppercase" }}>
                ✓ ACKNOWLEDGED · {cr.acknowledgedAt}
              </span>
            </div>
          </>
        ) : isHealthy ? (
          <>
            <div className="actions-row">
              <button className="btn btn-ghost" onClick={() => dispatch({ type: "goto", screen: "portfolio" })}>← BACK TO PORTFOLIO</button>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.14em", color: "var(--lime)", textTransform: "uppercase" }}>
                ✓ POSTURE STABLE · next scan in 6h
              </span>
            </div>
          </>
        ) : isNotion ? (
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
        ) : (
          // Generic open state for non-Notion P2 vendors
          <>
            <div className="actions-row">
              <button className="btn btn-primary">✓ ACKNOWLEDGE</button>
              <button className="btn btn-ghost">⏱ SNOOZE 48H</button>
              <button className="btn btn-ghost" onClick={() => dispatch({ type: "goto", screen: "portfolio" })}>← BACK</button>
            </div>
            <div className="actions-row">
              <button className="btn btn-ghost">⤓ EXPORT DIFF</button>
              <button className="btn btn-ghost">⊙ ASSIGN TO OWNER</button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

Object.assign(window, { ScreenChange });
