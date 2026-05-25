import { LayoutGrid, Rows } from "lucide-react";
import type { ViewMode } from "./types.js";

interface Props {
  view: ViewMode;
  onChange: (v: ViewMode) => void;
}

export function ViewToggle({ view, onChange }: Props): JSX.Element {
  return (
    <div
      role="group"
      aria-label="View mode"
      style={{
        display: "inline-flex",
        background: "#ffffff",
        border: "1px solid rgba(15,23,42,0.12)",
        borderRadius: 8,
        padding: 2,
      }}
    >
      <ToggleButton active={view === "grid"} onClick={() => onChange("grid")} label="Grid view">
        <LayoutGrid size={14} aria-hidden="true" /> Grid
      </ToggleButton>
      <ToggleButton active={view === "table"} onClick={() => onChange("table")} label="Table view">
        <Rows size={14} aria-hidden="true" /> Table
      </ToggleButton>
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "6px 10px",
        background: active ? "#0f172a" : "transparent",
        color: active ? "#ffffff" : "#475569",
        border: "none",
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 500,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

export function LoadingGrid(): JSX.Element {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: 16,
      }}
      aria-live="polite"
    >
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          aria-hidden="true"
          style={{
            background: "#ffffff",
            border: "1px solid rgba(15,23,42,0.06)",
            borderRadius: 16,
            height: 184,
            opacity: 0.5,
          }}
        />
      ))}
    </div>
  );
}

export function EmptyState(): JSX.Element {
  return (
    <div
      style={{
        padding: "64px 24px",
        textAlign: "center",
        background: "#ffffff",
        border: "1px dashed rgba(15,23,42,0.12)",
        borderRadius: 16,
        color: "#64748b",
        fontSize: 14,
      }}
    >
      No vendors match the current filters.
    </div>
  );
}
