import { useState } from "react";
import { Archive, Clock, ArrowUpRight } from "lucide-react";
import type { InboxItem } from "@unsyphn/shared";
import { VendorLogo } from "./VendorLogo.js";

interface Props {
  item: InboxItem;
  focused: boolean;
  selected: boolean;
  unread: boolean;
  escalated: boolean;
  showCheckbox: boolean;
  isFirst: boolean;
  isLast: boolean;
  onClick: () => void;
  onFocus: () => void;
  onToggleSelect: () => void;
  onSnooze: () => void;
  onArchive: () => void;
  onEscalate: () => void;
}

interface SevStyle { bg: string; fg: string; label: string }
const SEVERITY_STYLE: Record<string, SevStyle> = {
  P1: { bg: "rgba(239,68,68,0.10)", fg: "#dc2626", label: "P1" },
  P2: { bg: "rgba(245,158,11,0.10)", fg: "#b45309", label: "P2" },
  P3: { bg: "rgba(100,116,139,0.10)", fg: "#475569", label: "P3" },
};
const SEV_DEFAULT: SevStyle = { bg: "rgba(100,116,139,0.10)", fg: "#475569", label: "P3" };

function formatImpact(n: number | null): string {
  if (n === null) return "";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `$${Math.round(n / 1000)}k`;
  return `$${n}`;
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - Date.parse(iso);
  const diffMin = Math.floor(diffMs / 60_000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);
  if (diffMin < 60) return `${Math.max(1, diffMin)}m`;
  if (diffH < 24) return `${diffH}h`;
  if (diffD === 1) return "1d";
  if (diffD < 7) return `${diffD}d`;
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function MaterialChangeCard({
  item,
  focused,
  selected,
  unread,
  escalated,
  showCheckbox,
  isFirst,
  isLast,
  onClick,
  onFocus,
  onToggleSelect,
  onSnooze,
  onArchive,
  onEscalate,
}: Props): JSX.Element {
  const [hovered, setHovered] = useState(false);
  const sev: SevStyle = SEVERITY_STYLE[item.severity] ?? SEV_DEFAULT;

  const baseBg = selected
    ? "rgba(94,106,210,0.06)"
    : focused
      ? "rgba(94,106,210,0.04)"
      : hovered
        ? "#f1f5f9"
        : "#ffffff";

  const rowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 12,
    minHeight: 68,
    padding: "14px 24px",
    borderBottom: isLast ? "none" : "1px solid rgba(15,23,42,0.06)",
    borderTopLeftRadius: isFirst ? 8 : 0,
    borderTopRightRadius: isFirst ? 8 : 0,
    borderBottomLeftRadius: isLast ? 8 : 0,
    borderBottomRightRadius: isLast ? 8 : 0,
    background: baseBg,
    cursor: "pointer",
    outline: "none",
    boxShadow: focused ? "inset 2px 0 0 var(--accent)" : "none",
    transition: "background var(--dur-fast) var(--ease-out)",
    position: "relative",
  };

  const showCheckboxFinal = showCheckbox || hovered || selected;
  const showQuickActions = hovered;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Open ${item.title} from ${item.vendorName}`}
      style={rowStyle}
      onClick={onClick}
      onFocus={onFocus}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* Unread blue dot */}
      <span
        aria-hidden="true"
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: unread ? "var(--accent)" : "transparent",
          flexShrink: 0,
        }}
      />

      {/* Checkbox */}
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggleSelect}
        onClick={(e) => e.stopPropagation()}
        aria-label={`Select ${item.title}`}
        style={{
          width: 16,
          height: 16,
          margin: 0,
          cursor: "pointer",
          opacity: showCheckboxFinal ? 1 : 0,
          transition: "opacity var(--dur-fast) var(--ease-out)",
          flexShrink: 0,
        }}
      />

      {/* 24px round vendor logo */}
      <span
        style={{
          width: 24,
          height: 24,
          borderRadius: "50%",
          overflow: "hidden",
          flexShrink: 0,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <VendorLogo name={item.vendorName} size={24} />
      </span>

      {/* Vendor name (a bit emphasized) */}
      <span
        style={{
          fontSize: 13,
          fontWeight: unread ? 600 : 500,
          color: "#0f172a",
          minWidth: 110,
          maxWidth: 140,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        {item.vendorName}
      </span>

      {/* Middle: title + one-line preview */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        <span
          style={{
            fontSize: 15,
            fontWeight: unread ? 500 : 400,
            color: unread ? "#0f172a" : "#1e293b",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            lineHeight: 1.3,
          }}
        >
          {item.title}
        </span>
        <span
          style={{
            fontSize: 13,
            color: "#64748b",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            lineHeight: 1.3,
          }}
        >
          {item.summary}
        </span>
      </div>

      {/* Right gutter: quick actions OR meta */}
      {showQuickActions ? (
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          <QuickIcon label="Snooze" onClick={(e) => { e.stopPropagation(); onSnooze(); }}>
            <Clock size={14} aria-hidden="true" />
          </QuickIcon>
          <QuickIcon label="Archive (resolve)" onClick={(e) => { e.stopPropagation(); onArchive(); }}>
            <Archive size={14} aria-hidden="true" />
          </QuickIcon>
          <QuickIcon label="Escalate" onClick={(e) => { e.stopPropagation(); onEscalate(); }}>
            <ArrowUpRight size={14} aria-hidden="true" />
          </QuickIcon>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {escalated && (
            <span
              aria-label="Escalated"
              title="Escalated"
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "2px 8px",
                borderRadius: 9999,
                background: "rgba(94,106,210,0.10)",
                color: "var(--accent)",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.04em",
              }}
            >
              ESCALATED
            </span>
          )}
          <span
            aria-label={`Severity ${item.severity}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "2px 8px",
              borderRadius: 9999,
              background: sev.bg,
              color: sev.fg,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.04em",
            }}
          >
            {sev.label}
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: item.dollarImpact !== null ? "#0f172a" : "#94a3b8",
              minWidth: 48,
              textAlign: "right",
              fontWeight: 500,
            }}
          >
            {formatImpact(item.dollarImpact)}
          </span>
          <span
            style={{
              fontSize: 12,
              color: "#94a3b8",
              minWidth: 44,
              textAlign: "right",
            }}
          >
            {relativeTime(item.occurredAt)}
          </span>
        </div>
      )}
    </div>
  );
}

function QuickIcon({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      style={{
        width: 30,
        height: 30,
        border: "none",
        background: "transparent",
        color: "#64748b",
        borderRadius: 6,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = "rgba(15,23,42,0.06)";
        (e.currentTarget as HTMLElement).style.color = "#0f172a";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = "transparent";
        (e.currentTarget as HTMLElement).style.color = "#64748b";
      }}
    >
      {children}
    </button>
  );
}
