// escalate.jsx — Escalate-to-Legal modal

function EscalateModal({ state, dispatch }) {
  const [msg, setMsg] = React.useState(
    "Notion ToS change: PII retention 90→30d violates DPA §3.1. Pricing +18% with renewal in 42 days. Negotiate both: retention back to 60d (industry standard), price locked at prior $10/seat."
  );
  const [deadline, setDeadline] = React.useState("2026-05-29");

  return (
    <div className="modal-scrim" onClick={(e) => { if (e.target === e.currentTarget) dispatch({ type: "close-escalate" }); }}>
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal-head">
          <div className="left">
            <div className="eyebrow">⚠ P1 · ESCALATE</div>
            <h2 className="ttl">Route ChangeReport <em>RL·4839</em> to Legal.</h2>
          </div>
          <button className="icon-btn" onClick={() => dispatch({ type: "close-escalate" })} title="Close">✕</button>
        </div>

        <div className="modal-body">

          <div className="field">
            <div className="field-label"><span>Recipients</span><span>2 · BOTH NOTIFIED</span></div>
            <div className="recipients">
              <div className="recipient">
                <div className="av" style={{ background: "linear-gradient(135deg, var(--grape), var(--strawberry))" }}>PN</div>
                <div>
                  <div className="who">Priya Natarajan</div>
                  <div className="role">LEGAL COUNSEL</div>
                </div>
              </div>
              <div className="recipient">
                <div className="av" style={{ background: "linear-gradient(135deg, var(--tangerine), var(--strawberry))" }}>MC</div>
                <div>
                  <div className="who">Marcus Chen</div>
                  <div className="role">PROCUREMENT</div>
                </div>
              </div>
            </div>
          </div>

          <div className="field">
            <div className="field-label"><span>Severity</span><span style={{ color: "var(--muted)" }}>LOCKED · POLICY-DRIVEN</span></div>
            <input className="field-input locked" value="P1 · CRITICAL" readOnly />
          </div>

          <div className="field">
            <div className="field-label"><span>Message</span><span className="req">REQUIRED</span></div>
            <textarea
              className="field-input"
              rows={4}
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
            />
          </div>

          <div className="field">
            <div className="field-label"><span>Citations to attach</span><span style={{ color: "var(--lime)" }}>✓ 4 GROUNDED</span></div>
            <div className="cite-list">
              <div className="cite"><span className="ck">✓</span><span className="src">notion.so/terms#4.2 · §4.2 Data Retention</span><span className="hash">8b2e…f94a</span></div>
              <div className="cite"><span className="ck">✓</span><span className="src">notion.so/pricing · §7.1 Plus Plan</span><span className="hash">d4a1…2c7b</span></div>
              <div className="cite"><span className="ck">✓</span><span className="src">internal · DPA §3.1 (Acme ⟷ Notion)</span><span className="hash">f9c3…81de</span></div>
              <div className="cite"><span className="ck">✓</span><span className="src">policy · severity-rules.yaml · v4</span><span className="hash">a3f9…d21c</span></div>
            </div>
          </div>

          <div className="field" style={{ flexDirection: "row", gap: 14 }}>
            <div className="field" style={{ flex: 1 }}>
              <div className="field-label"><span>Owner</span></div>
              <input className="field-input" value="Priya Natarajan" readOnly />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <div className="field-label"><span>Deadline</span></div>
              <input className="field-input" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
          </div>

        </div>

        <div className="modal-foot">
          <div className="left">
            All actions logged · <b>4 citations</b> · agent-redline-v1.4
          </div>
          <div className="actions-row">
            <button className="btn btn-ghost" onClick={() => dispatch({ type: "close-escalate" })}>Cancel</button>
            <button className="btn btn-escalate" onClick={() => dispatch({ type: "confirm-escalate" })}>
              ↑ ROUTE &amp; GENERATE BUNDLE →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { EscalateModal });
