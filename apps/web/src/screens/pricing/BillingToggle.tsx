import type { BillingCadence } from "./tiers.js";

interface BillingToggleProps {
  value: BillingCadence;
  onChange: (next: BillingCadence) => void;
}

const baseBtn: React.CSSProperties = {
  height: 32,
  padding: "0 var(--space-4)",
  background: "transparent",
  color: "var(--text-2)",
  border: "none",
  fontFamily: "var(--font-text)",
  fontSize: "var(--text-sm)",
  cursor: "pointer",
  borderRadius: "999px",
  display: "inline-flex",
  alignItems: "center",
  gap: "var(--space-2)",
  transition: "background 100ms, color 100ms",
};
const activeBtn: React.CSSProperties = {
  ...baseBtn,
  background: "var(--surface)",
  color: "var(--text-strong)",
  border: "1px solid var(--border)",
};

export function BillingToggle({ value, onChange }: BillingToggleProps): JSX.Element {
  return (
    <div
      role="group"
      aria-label="Billing cadence"
      style={{
        display: "inline-flex",
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        padding: 4,
        borderRadius: "999px",
        gap: 4,
      }}
    >
      <button
        type="button"
        style={value === "monthly" ? activeBtn : baseBtn}
        onClick={() => onChange("monthly")}
        aria-pressed={value === "monthly"}
      >
        Monthly
      </button>
      <button
        type="button"
        style={value === "annual" ? activeBtn : baseBtn}
        onClick={() => onChange("annual")}
        aria-pressed={value === "annual"}
      >
        Annual
        <span
          style={{
            background: "var(--accent)",
            color: "var(--bg)",
            fontSize: "var(--text-xs)",
            padding: "2px 6px",
            borderRadius: "999px",
            fontWeight: 500,
          }}
        >
          20% off
        </span>
      </button>
    </div>
  );
}
