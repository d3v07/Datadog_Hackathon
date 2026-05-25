import { Circle } from "lucide-react";
import type { InboxItem } from "@unsyphn/shared";
import { VendorLogo } from "./VendorLogo.js";

interface Props {
  item: InboxItem;
  focused: boolean;
  selected: boolean;
  onClick: () => void;
  onFocus: () => void;
}

const SEVERITY_COLOR: Record<string, string> = {
  P1: "var(--danger)",
  P2: "var(--warning)",
  P3: "var(--success)",
};

function formatImpact(n: number | null): string {
  if (n === null) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `$${Math.round(n / 1000)}k`;
  return `$${n}`;
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - Date.parse(iso);
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "1d ago";
  return `${diffDays}d ago`;
}

function ownerMonogram(email: string): string {
  const local = email.split("@")[0] ?? email;
  const parts = local.split(/[._\-+]/);
  if (parts.length >= 2) {
    return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
  }
  return local.slice(0, 2).toUpperCase();
}

export function MaterialChangeCard({ item, focused, selected, onClick, onFocus }: Props): JSX.Element {
  const dotColor = SEVERITY_COLOR[item.severity] ?? "var(--text-muted)";

  const rowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-3)",
    height: 44,
    padding: "0 var(--space-4)",
    borderBottom: "1px solid var(--border)",
    background: focused ? "var(--accent-soft)" : selected ? "var(--surface-2)" : "var(--surface)",
    cursor: "pointer",
    outline: "none",
    boxShadow: focused ? "var(--ring-focus)" : "none",
    transition: "background var(--dur-fast) var(--ease-out)",
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Open ${item.title} from ${item.vendorName}`}
      style={rowStyle}
      onClick={onClick}
      onFocus={onFocus}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      onMouseEnter={(e) => {
        if (!focused) (e.currentTarget as HTMLElement).style.background = "var(--surface-2)";
      }}
      onMouseLeave={(e) => {
        if (!focused) (e.currentTarget as HTMLElement).style.background = "var(--surface)";
      }}
    >
      {/* Severity dot */}
      <span style={{ color: dotColor, flexShrink: 0 }} aria-label={item.severity}>
        <Circle size={8} fill="currentColor" aria-hidden="true" />
      </span>

      {/* Severity label */}
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "var(--text-xs)",
          color: dotColor,
          width: 20,
          flexShrink: 0,
        }}
      >
        {item.severity}
      </span>

      {/* Vendor logo */}
      <VendorLogo name={item.vendorName} size={24} />

      {/* Vendor name + title */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <span
          style={{
            fontSize: "var(--text-sm)",
            fontWeight: 500,
            color: "var(--text-strong)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            lineHeight: 1.2,
          }}
        >
          {item.vendorName}
        </span>
        <span
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--text-2)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            lineHeight: 1.3,
          }}
        >
          {item.title}
        </span>
      </div>

      {/* Right side: impact + owner + time */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexShrink: 0 }}>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-xs)",
            color: item.dollarImpact !== null ? "var(--text-strong)" : "var(--text-muted)",
            width: 48,
            textAlign: "right",
          }}
        >
          {formatImpact(item.dollarImpact)}
        </span>

        {/* Owner monogram */}
        <span
          title={item.ownerEmail}
          aria-label={`Owner: ${item.ownerEmail}`}
          style={{
            width: 24,
            height: 24,
            borderRadius: "var(--radius-full)",
            background: "var(--accent-soft)",
            color: "var(--accent)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "var(--text-xs)",
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          {ownerMonogram(item.ownerEmail)}
        </span>

        <span
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--text-muted)",
            width: 44,
            textAlign: "right",
          }}
        >
          {relativeTime(item.occurredAt)}
        </span>
      </div>
    </div>
  );
}
