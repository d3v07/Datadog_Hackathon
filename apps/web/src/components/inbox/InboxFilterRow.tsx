import { useRef } from "react";
import { Search } from "lucide-react";

type FilterKind = "all" | "changes" | "renewals" | "unused-seats";
type SeverityFilter = "all" | "P1" | "P2";

interface InboxFilterRowProps {
  filter: FilterKind;
  severity: SeverityFilter;
  query: string;
  onFilterChange: (value: FilterKind) => void;
  onSeverityChange: (value: SeverityFilter) => void;
  onQueryChange: (value: string) => void;
}

const FILTER_CHIPS: Array<{ label: string; value: FilterKind }> = [
  { label: "All", value: "all" },
  { label: "Changes", value: "changes" },
  { label: "Renewals", value: "renewals" },
  { label: "Unused seats", value: "unused-seats" },
];

export function InboxFilterRow({
  filter,
  severity,
  query,
  onFilterChange,
  onSeverityChange,
  onQueryChange,
}: InboxFilterRowProps): JSX.Element {
  const searchRef = useRef<HTMLInputElement>(null);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-2)",
        marginBottom: 16,
        flexWrap: "wrap",
      }}
    >
      {FILTER_CHIPS.map(({ label, value }) => (
        <button
          key={value}
          type="button"
          onClick={() => onFilterChange(value)}
          aria-pressed={filter === value}
          className={filter === value ? "badge badge-accent" : "badge badge-neutral"}
          style={{ cursor: "pointer", border: "none" }}
        >
          {label}
        </button>
      ))}

      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
        <select
          className="input"
          style={{ width: "auto", height: 28, fontSize: "var(--text-xs)" }}
          value={severity}
          onChange={(e) => onSeverityChange(e.target.value as SeverityFilter)}
          aria-label="Filter by severity"
        >
          <option value="all">All severities</option>
          <option value="P1">P1 only</option>
          <option value="P2">P2+ only</option>
        </select>

        <div style={{ position: "relative", width: 220 }}>
          <Search
            size={13}
            aria-hidden="true"
            style={{
              position: "absolute",
              left: 8,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
              pointerEvents: "none",
            }}
          />
          <input
            ref={searchRef}
            className="input"
            type="search"
            placeholder="Search vendor, title, summary…"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            style={{ height: 28, paddingLeft: 26, fontSize: "var(--text-xs)" }}
            aria-label="Search inbox"
          />
        </div>
      </div>
    </div>
  );
}
