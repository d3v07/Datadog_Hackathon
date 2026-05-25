import type { FindingState, FindingType } from "../../lib/api.js";

export type SeverityFilter = "P1" | "P2" | "P3";

interface Props {
  typeFilter: FindingType | "all";
  severityFilter: SeverityFilter | "all";
  stateFilter: FindingState | "all";
  onTypeChange: (next: FindingType | "all") => void;
  onSeverityChange: (next: SeverityFilter | "all") => void;
  onStateChange: (next: FindingState | "all") => void;
}

const TYPE_CHIPS: Array<{ value: FindingType | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "change", label: "Change" },
  { value: "compliance", label: "Compliance" },
  { value: "subprocessor", label: "Sub-processor" },
  { value: "spend", label: "Spend" },
  { value: "security", label: "Security" },
];

const SEVERITY_CHIPS: Array<{ value: SeverityFilter | "all"; label: string }> = [
  { value: "all", label: "All severities" },
  { value: "P1", label: "P1" },
  { value: "P2", label: "P2" },
  { value: "P3", label: "P3" },
];

const STATE_CHIPS: Array<{ value: FindingState | "all"; label: string }> = [
  { value: "all", label: "All states" },
  { value: "open", label: "Open" },
  { value: "under-review", label: "Under review" },
  { value: "resolved", label: "Resolved" },
];

function ChipGroup<T extends string>({
  label,
  chips,
  value,
  onChange,
}: {
  label: string;
  chips: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (next: T) => void;
}): JSX.Element {
  return (
    <div
      role="group"
      aria-label={label}
      style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "var(--text-muted)",
          marginRight: 4,
        }}
      >
        {label}
      </span>
      {chips.map((chip) => (
        <button
          key={chip.value}
          type="button"
          onClick={() => onChange(chip.value)}
          aria-pressed={value === chip.value}
          className={value === chip.value ? "badge badge-accent" : "badge badge-neutral"}
          style={{ cursor: "pointer", border: "none" }}
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}

export function FindingsFilters({
  typeFilter,
  severityFilter,
  stateFilter,
  onTypeChange,
  onSeverityChange,
  onStateChange,
}: Props): JSX.Element {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
        marginBottom: "var(--space-5)",
      }}
    >
      <ChipGroup<FindingType | "all">
        label="Type"
        chips={TYPE_CHIPS}
        value={typeFilter}
        onChange={onTypeChange}
      />
      <ChipGroup<SeverityFilter | "all">
        label="Severity"
        chips={SEVERITY_CHIPS}
        value={severityFilter}
        onChange={onSeverityChange}
      />
      <ChipGroup<FindingState | "all">
        label="State"
        chips={STATE_CHIPS}
        value={stateFilter}
        onChange={onStateChange}
      />
    </div>
  );
}
