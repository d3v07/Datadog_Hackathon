// routing.jsx — full-screen routing transition (streams log, auto-advances to evidence)

const ROUTING_LOG = [
  { ts: "14:59:01", lvl: "info", msg: <>Policy fired · <b>severity-rules.yaml v4</b> · severity P1</> },
  { ts: "14:59:02", lvl: "exec", msg: <>Slack DM dispatched · <b>@priya</b> · message + 4 citations</> },
  { ts: "14:59:03", lvl: "exec", msg: <>Jira ticket created · <b>PROC-2104</b> · assigned to Marcus Chen</> },
  { ts: "14:59:04", lvl: "exec", msg: <>Calendar invite sent · <b>Jun 24 · Notion renewal call</b> · 4 invitees</> },
  { ts: "14:59:05", lvl: "exec", msg: <>Renegotiation draft generated · <b>3 positions</b> · saved to Drafts</> },
  { ts: "14:59:06", lvl: "info", msg: <>Compiling evidence bundle <b>RL·4839</b> · 4 grounded citations</> },
  { ts: "14:59:07", lvl: "sign", msg: <>Clauses extracted · §4.2 Retention · §7.1 Pricing · DPA §3.1 · policy</> },
  { ts: "14:59:08", lvl: "sign", msg: <>Bundle signed · hash <b>8b2e…f94a</b> · witnessed by agent-redline-v1.4</> },
  { ts: "14:59:09", lvl: "ok",   msg: <>Bundle <b>RL·4839</b> written · grounded · routed · ready</> },
];

function RoutingTransition({ dispatch }) {
  const [shown, setShown] = React.useState(0);

  React.useEffect(() => {
    if (shown >= ROUTING_LOG.length) {
      // Slight settle, then advance
      const t = setTimeout(() => dispatch({ type: "finish-routing" }), 1100);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setShown((s) => s + 1), 220);
    return () => clearTimeout(t);
  }, [shown, dispatch]);

  const visible = ROUTING_LOG.slice(0, shown);

  return (
    <div className="routing-screen">
      <div className="routing-pulse" />
      <h1 className="routing-title">
        Routed to <em>Priya</em>. Bundle <em>RL·4839</em> generating…
      </h1>
      <div className="routing-log">
        {visible.map((l, i) => (
          <div className={"line" + (i === visible.length - 1 ? " new" : "")} key={i}>
            <span className="ts">{l.ts}</span>
            <span className={"lvl " + l.lvl}>{l.lvl.toUpperCase()}</span>
            <span className="msg">{l.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { RoutingTransition });
