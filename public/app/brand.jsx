// brand.jsx — the Unsyphn wordmark

function UnsyphnMark({ size = 18 }) {
  return (
    <img
      src="/logo.png"
      alt="Unsyphn"
      style={{ height: size, width: "auto", display: "block" }}
    />
  );
}

function UnsyphnDot({ size = 16, animate = true }) {
  return (
    <span
      className={animate ? "live-dot pulse" : "live-dot"}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "var(--bondi)",
        boxShadow: `0 0 ${size}px var(--bondi-glow), 0 0 ${size * 2}px var(--bondi-glow)`,
        display: "inline-block",
        flexShrink: 0,
      }}
    />
  );
}

Object.assign(window, { UnsyphnMark, UnsyphnDot });
