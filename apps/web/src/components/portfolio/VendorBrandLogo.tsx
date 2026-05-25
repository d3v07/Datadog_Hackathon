import { useState } from "react";
import { simpleIconsUrlForId, monogramFor } from "../../lib/logos.js";

interface Props {
  vendorId: string;
  name: string;
  size?: number;
}

// Card/table logo. Uses the curated `VENDOR_BRAND` slug+hex map so each card
// shows the brand-colored mark. Falls back to a colored monogram circle when
// the CDN 404s (or when the id isn't in the brand map).
export function VendorBrandLogo({ vendorId, name, size = 32 }: Props): JSX.Element {
  const [errored, setErrored] = useState(false);
  const url = simpleIconsUrlForId(vendorId);

  const wrap: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: 8,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    background: "var(--surface)",
    border: "1px solid rgba(15,23,42,0.06)",
    overflow: "hidden",
  };

  if (url && !errored) {
    return (
      <span style={wrap} aria-label={`${name} logo`}>
        <img
          src={url}
          alt=""
          width={Math.round(size * 0.62)}
          height={Math.round(size * 0.62)}
          onError={() => setErrored(true)}
          style={{ objectFit: "contain", display: "block" }}
        />
      </span>
    );
  }

  const mono = monogramFor(name);
  return (
    <span
      style={{
        ...wrap,
        background: mono.bg,
        color: mono.fg,
        fontWeight: 600,
        fontSize: Math.round(size * 0.38),
      }}
      aria-label={`${name} logo`}
    >
      {mono.initials}
    </span>
  );
}
