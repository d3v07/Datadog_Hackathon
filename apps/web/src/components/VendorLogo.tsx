import { useState } from "react";
import { simpleIconsUrl, brandfetchUrl, monogramFor } from "../lib/logos.js";

interface Props {
  name: string;
  domain?: string;
  size?: number;
}

export function VendorLogo({ name, domain, size = 32 }: Props) {
  const [stage, setStage] = useState<0 | 1 | 2>(0);

  const containerStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
    background: "var(--surface)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flexShrink: 0,
  };

  if (stage === 0) {
    return (
      <span style={containerStyle} aria-label={`${name} logo`}>
        <img
          src={simpleIconsUrl(name)}
          alt=""
          width={Math.round(size * 0.66)}
          height={Math.round(size * 0.66)}
          onError={() => setStage(domain ? 1 : 2)}
          style={{ objectFit: "contain" }}
        />
      </span>
    );
  }

  if (stage === 1 && domain) {
    return (
      <span style={containerStyle} aria-label={`${name} logo`}>
        <img
          src={brandfetchUrl(domain)}
          alt=""
          width={Math.round(size * 0.7)}
          height={Math.round(size * 0.7)}
          onError={() => setStage(2)}
          style={{ objectFit: "contain" }}
        />
      </span>
    );
  }

  const { initials, bg, fg } = monogramFor(name);
  return (
    <span
      style={{
        ...containerStyle,
        background: bg,
        color: fg,
        fontWeight: 600,
        fontSize: Math.round(size * 0.4),
      }}
      aria-label={`${name} logo`}
    >
      {initials}
    </span>
  );
}
