import { useState } from "react";
import { CheckCircle2, Clock, Archive, ArrowUpRight, X } from "lucide-react";

interface Props {
  count: number;
  onMarkRead: () => void;
  onSnooze: (untilIso: string) => void;
  onResolve: () => void;
  onEscalate: () => void;
  onClear: () => void;
}

function plus48hIso(): string {
  return new Date(Date.now() + 48 * 3600 * 1000).toISOString();
}

function plus1wIso(): string {
  return new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
}

export function BulkActionBar({
  count,
  onMarkRead,
  onSnooze,
  onResolve,
  onEscalate,
  onClear,
}: Props): JSX.Element {
  const [snoozeOpen, setSnoozeOpen] = useState(false);

  return (
    <div
      role="region"
      aria-live="polite"
      aria-label={`${count} selected`}
      style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 16px",
        background: "#0f172a",
        color: "#f8fafc",
        borderRadius: 8,
        marginBottom: 12,
        fontSize: 13,
        boxShadow: "0 4px 12px rgba(15,23,42,0.18)",
      }}
    >
      <button
        type="button"
        onClick={onClear}
        aria-label="Clear selection"
        style={{
          width: 28,
          height: 28,
          border: "none",
          background: "transparent",
          color: "#cbd5e1",
          borderRadius: 4,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <X size={16} aria-hidden="true" />
      </button>

      <span style={{ fontWeight: 500 }}>
        {count} selected
      </span>

      <div style={{ flex: 1 }} />

      <BulkBtn onClick={onMarkRead}>
        <CheckCircle2 size={14} aria-hidden="true" />
        Mark read
      </BulkBtn>

      <div style={{ position: "relative" }}>
        <BulkBtn onClick={() => setSnoozeOpen((v) => !v)} aria-expanded={snoozeOpen}>
          <Clock size={14} aria-hidden="true" />
          Snooze
        </BulkBtn>
        {snoozeOpen && (
          <div
            role="menu"
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              right: 0,
              background: "#fff",
              color: "#0f172a",
              borderRadius: 8,
              boxShadow: "0 8px 24px rgba(15,23,42,0.16)",
              padding: 6,
              display: "flex",
              flexDirection: "column",
              minWidth: 160,
              zIndex: 30,
            }}
          >
            <SnoozeOption
              label="48 hours"
              onClick={() => {
                setSnoozeOpen(false);
                onSnooze(plus48hIso());
              }}
            />
            <SnoozeOption
              label="1 week"
              onClick={() => {
                setSnoozeOpen(false);
                onSnooze(plus1wIso());
              }}
            />
          </div>
        )}
      </div>

      <BulkBtn onClick={onResolve}>
        <Archive size={14} aria-hidden="true" />
        Resolve
      </BulkBtn>

      <BulkBtn onClick={onEscalate}>
        <ArrowUpRight size={14} aria-hidden="true" />
        Escalate
      </BulkBtn>
    </div>
  );
}

function BulkBtn({
  onClick,
  children,
  ...rest
}: {
  onClick: () => void;
  children: React.ReactNode;
  "aria-expanded"?: boolean;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      {...rest}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: 28,
        padding: "0 10px",
        border: "1px solid rgba(248,250,252,0.15)",
        background: "rgba(248,250,252,0.06)",
        color: "#f8fafc",
        borderRadius: 6,
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 500,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = "rgba(248,250,252,0.14)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = "rgba(248,250,252,0.06)";
      }}
    >
      {children}
    </button>
  );
}

function SnoozeOption({ label, onClick }: { label: string; onClick: () => void }): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      role="menuitem"
      style={{
        textAlign: "left",
        border: "none",
        background: "transparent",
        padding: "8px 10px",
        fontSize: 13,
        color: "#0f172a",
        cursor: "pointer",
        borderRadius: 4,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = "#f1f5f9";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = "transparent";
      }}
    >
      {label}
    </button>
  );
}
