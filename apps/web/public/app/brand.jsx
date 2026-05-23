// brand.jsx — the Unsyphn wordmark (mid-dot bondi pulse ligature)

function UnsyphnMark({ size = 18, color = "var(--text-strong)", animate = true, withDot = true }) {
  // Renders: UN·SYPHN with a bondi live-dot replacing the natural mid-character break.
  // Source: design direction #06 from the logo deck.
  const dotSize = Math.round(size * 0.36);
  return (
    <span
      className="unsyphn-mark"
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontFamily: 'var(--font-serif, "Source Serif 4", ui-serif, Georgia, serif)',
        fontWeight: 700,
        fontSize: size,
        letterSpacing: "-0.014em",
        lineHeight: 1,
        color,
        fontFeatureSettings: '"tnum" 1',
      }}
    >
      <span style={{ paddingRight: withDot ? Math.round(size * 0.04) : 0 }}>UN</span>
      {withDot && (
        <span
          className={animate ? "live-dot pulse" : "live-dot"}
          style={{
            width: dotSize,
            height: dotSize,
            borderRadius: "50%",
            margin: `0 ${Math.round(size * 0.10)}px ${Math.round(size * 0.10)}px`,
            background: "var(--bondi)",
            boxShadow:
              "0 0 " + Math.round(size * 0.7) + "px var(--bondi-glow), 0 0 " +
              Math.round(size * 1.2) + "px var(--bondi-glow)",
            display: "inline-block",
            flexShrink: 0,
          }}
        />
      )}
      <span style={{ paddingLeft: withDot ? Math.round(size * 0.04) : 0 }}>SYPHN</span>
    </span>
  );
}

// Compact dot-only mark for very small sizes (favicons, app icons)
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
