// routing.jsx — full-screen routing transition (streams log, auto-advances to evidence).
// Pulls the log + title from VENDOR_DATA[activeVendor]; falls back to Notion's defaults.

function RoutingTransition({ dispatch, vendorKey }) {
  const DATA = window.VENDOR_DATA || {};
  const vendor = DATA[vendorKey || "notion"] || DATA.notion || {};
  const log = vendor.routingLog || [];
  const title = vendor.routingTitle || <>Routing in progress…</>;

  const [shown, setShown] = React.useState(0);

  React.useEffect(() => {
    if (shown >= log.length) {
      const t = setTimeout(() => dispatch({ type: "finish-routing" }), 1100);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setShown((s) => s + 1), 220);
    return () => clearTimeout(t);
  }, [shown, dispatch, log.length]);

  const visible = log.slice(0, shown);

  return (
    <div className="routing-screen">
      <div className="routing-pulse" />
      <h1 className="routing-title">{title}</h1>
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
