import { Search, X } from "lucide-react";
import type { TeamMember } from "../../lib/api.js";
import type { PortfolioFilterState, PostureFilter, SortKey } from "./types.js";
import { isFiltersActive } from "./types.js";

interface Props {
  state: PortfolioFilterState;
  onChange: (next: PortfolioFilterState) => void;
  categoryOptions: ReadonlyArray<string>;
  ownerOptions: ReadonlyArray<TeamMember>;
}

const SORT_OPTIONS: ReadonlyArray<{ value: SortKey; label: string }> = [
  { value: "default", label: "Default" },
  { value: "spend-desc", label: "Spend (high → low)" },
  { value: "renew-soon", label: "Renewing soonest" },
  { value: "tier", label: "Tier" },
  { value: "posture", label: "Posture" },
  { value: "name", label: "Name" },
];

const TIERS: ReadonlyArray<1 | 2 | 3> = [1, 2, 3];
const POSTURES: ReadonlyArray<PostureFilter> = ["ok", "watch", "risk"];

function toggleInArray<T>(arr: ReadonlyArray<T>, v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

export function PortfolioFilters({
  state,
  onChange,
  categoryOptions,
  ownerOptions,
}: Props): JSX.Element {
  const active = isFiltersActive(state);

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        alignItems: "center",
        padding: "12px 0",
      }}
      role="region"
      aria-label="Vendor filters"
    >
      {/* Search */}
      <div
        style={{
          position: "relative",
          flex: "1 1 240px",
          maxWidth: 320,
          minWidth: 200,
        }}
      >
        <Search
          size={14}
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 10,
            top: "50%",
            transform: "translateY(-50%)",
            color: "#94a3b8",
            pointerEvents: "none",
          }}
        />
        <input
          type="search"
          value={state.q}
          onChange={(e) => onChange({ ...state, q: e.target.value })}
          placeholder="Search vendors..."
          aria-label="Search vendors"
          style={{
            width: "100%",
            padding: "8px 12px 8px 30px",
            fontSize: 13,
            border: "1px solid rgba(15,23,42,0.12)",
            borderRadius: 8,
            background: "#ffffff",
            color: "#0f172a",
            outline: "none",
          }}
        />
      </div>

      <ChipGroup label="Tier">
        {TIERS.map((t) => (
          <Chip
            key={t}
            active={state.tiers.includes(t)}
            onClick={() => onChange({ ...state, tiers: toggleInArray(state.tiers, t) })}
            label={`T${t}`}
          />
        ))}
      </ChipGroup>

      <ChipGroup label="Posture">
        {POSTURES.map((p) => (
          <Chip
            key={p}
            active={state.postures.includes(p)}
            onClick={() => onChange({ ...state, postures: toggleInArray(state.postures, p) })}
            label={p === "ok" ? "OK" : p === "watch" ? "Watch" : "Risk"}
          />
        ))}
      </ChipGroup>

      <SelectMulti
        label="Category"
        options={categoryOptions.map((c) => ({ value: c, label: c }))}
        selected={state.categories}
        onChange={(next) => onChange({ ...state, categories: next })}
      />

      <select
        value={state.owner}
        onChange={(e) => onChange({ ...state, owner: e.target.value })}
        aria-label="Filter by owner"
        style={baseSelectStyle}
      >
        <option value="">All owners</option>
        {ownerOptions.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>

      <select
        value={state.sort}
        onChange={(e) => onChange({ ...state, sort: e.target.value as SortKey })}
        aria-label="Sort"
        style={baseSelectStyle}
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            Sort: {o.label}
          </option>
        ))}
      </select>

      {active && (
        <button
          type="button"
          onClick={() => onChange({ ...state, q: "", tiers: [], postures: [], categories: [], owner: "", sort: "default" })}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "6px 10px",
            background: "transparent",
            border: "1px solid rgba(15,23,42,0.12)",
            borderRadius: 8,
            color: "#475569",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          <X size={12} aria-hidden="true" /> Reset
        </button>
      )}
    </div>
  );
}

const baseSelectStyle: React.CSSProperties = {
  padding: "8px 10px",
  fontSize: 13,
  border: "1px solid rgba(15,23,42,0.12)",
  borderRadius: 8,
  background: "#ffffff",
  color: "#0f172a",
  cursor: "pointer",
  textTransform: "capitalize",
};

function ChipGroup({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <div
      role="group"
      aria-label={label}
      style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 6px 2px 0" }}
    >
      <span style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginRight: 4 }}>
        {label}
      </span>
      {children}
    </div>
  );
}

function Chip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        padding: "4px 10px",
        fontSize: 12,
        fontWeight: 500,
        borderRadius: 9999,
        border: active ? "1px solid #5E6AD2" : "1px solid rgba(15,23,42,0.12)",
        background: active ? "#5E6AD2" : "#ffffff",
        color: active ? "#ffffff" : "#475569",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

interface SelectMultiProps {
  label: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  selected: ReadonlyArray<string>;
  onChange: (next: string[]) => void;
}

function SelectMulti({ label, options, selected, onChange }: SelectMultiProps): JSX.Element {
  // Single-row pseudo-multi: <select> with shift/cmd selection is awkward;
  // expose as a button list that toggles. Keep it compact with a value summary.
  const summary =
    selected.length === 0
      ? label
      : selected.length === 1
        ? `${label}: ${selected[0]}`
        : `${label}: ${selected.length}`;

  return (
    <details
      style={{
        position: "relative",
        display: "inline-block",
      }}
    >
      <summary
        style={{
          ...baseSelectStyle,
          listStyle: "none",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        {summary}
        <span aria-hidden="true">▾</span>
      </summary>
      <div
        style={{
          position: "absolute",
          top: "calc(100% + 4px)",
          left: 0,
          minWidth: 180,
          maxHeight: 280,
          overflowY: "auto",
          background: "#ffffff",
          border: "1px solid rgba(15,23,42,0.08)",
          borderRadius: 8,
          boxShadow: "0 8px 24px rgba(15,23,42,0.10)",
          zIndex: 50,
          padding: 6,
        }}
      >
        {options.map((o) => {
          const checked = selected.includes(o.value);
          return (
            <label
              key={o.value}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 8px",
                fontSize: 13,
                color: "#0f172a",
                cursor: "pointer",
                borderRadius: 6,
                textTransform: "capitalize",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#f8fafc")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onChange(toggleInArray(selected, o.value))}
              />
              {o.label}
            </label>
          );
        })}
      </div>
    </details>
  );
}
