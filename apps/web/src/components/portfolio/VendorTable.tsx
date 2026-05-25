import { useState } from "react";
import type { Vendor } from "@unsyphn/shared";
import type { TeamMember } from "../../lib/api.js";
import { VendorBrandLogo } from "./VendorBrandLogo.js";
import { daysUntil, fmtUsd, postureBg, postureColor } from "./types.js";
import { ChevronDown, ChevronUp } from "lucide-react";

type Col =
  | "name"
  | "category"
  | "tier"
  | "posture"
  | "spend"
  | "seats"
  | "renews"
  | "owner";

interface Props {
  vendors: Vendor[];
  owners: Map<string, TeamMember>;
  selectedIds: ReadonlySet<string>;
  onToggleSelect: (id: string) => void;
  onToggleAll: () => void;
  allSelected: boolean;
}

function compare(a: Vendor, b: Vendor, c: Col): number {
  switch (c) {
    case "name":
      return a.name.localeCompare(b.name);
    case "category":
      return (a.category ?? "").localeCompare(b.category ?? "");
    case "tier":
      return (a.tier ?? 9) - (b.tier ?? 9);
    case "posture": {
      const order: Record<string, number> = { risk: 0, watch: 1, ok: 2 };
      return (order[a.posture ?? "ok"] ?? 9) - (order[b.posture ?? "ok"] ?? 9);
    }
    case "spend":
      return (b.contract?.annualSpendUsd ?? 0) - (a.contract?.annualSpendUsd ?? 0);
    case "seats":
      return (b.contract?.seatCount ?? 0) - (a.contract?.seatCount ?? 0);
    case "renews": {
      const da = daysUntil(a.contract?.renewsAt) ?? 9999;
      const db = daysUntil(b.contract?.renewsAt) ?? 9999;
      return da - db;
    }
    case "owner":
      return (a.ownerId ?? "").localeCompare(b.ownerId ?? "");
  }
}

const TH_STYLE: React.CSSProperties = {
  padding: "10px 14px",
  textAlign: "left",
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "#64748b",
  background: "#f8fafc",
  borderBottom: "1px solid rgba(15,23,42,0.08)",
  cursor: "pointer",
  userSelect: "none",
};

const TD_STYLE: React.CSSProperties = {
  padding: "12px 14px",
  fontSize: 13,
  color: "#0f172a",
  borderBottom: "1px solid rgba(15,23,42,0.06)",
};

export function VendorTable({
  vendors,
  owners,
  selectedIds,
  onToggleSelect,
  onToggleAll,
  allSelected,
}: Props): JSX.Element {
  const [sortCol, setSortCol] = useState<Col>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const onHeaderClick = (c: Col) => {
    if (sortCol === c) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortCol(c);
      setSortDir("asc");
    }
  };

  const sorted = [...vendors].sort((a, b) => {
    const v = compare(a, b, sortCol);
    return sortDir === "asc" ? v : -v;
  });

  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid rgba(15,23,42,0.08)",
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: "0 6px 20px rgba(15,23,42,0.06)",
      }}
    >
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ ...TH_STYLE, width: 36, cursor: "default" }}>
              <input
                type="checkbox"
                checked={allSelected}
                aria-label="Select all rows"
                onChange={onToggleAll}
                style={{ cursor: "pointer" }}
              />
            </th>
            <ColHead col="name" label="Vendor" sortCol={sortCol} sortDir={sortDir} onClick={onHeaderClick} />
            <ColHead col="category" label="Category" sortCol={sortCol} sortDir={sortDir} onClick={onHeaderClick} />
            <ColHead col="tier" label="Tier" sortCol={sortCol} sortDir={sortDir} onClick={onHeaderClick} />
            <ColHead col="posture" label="Posture" sortCol={sortCol} sortDir={sortDir} onClick={onHeaderClick} />
            <ColHead col="spend" label="Spend" sortCol={sortCol} sortDir={sortDir} onClick={onHeaderClick} align="right" />
            <ColHead col="seats" label="Seats" sortCol={sortCol} sortDir={sortDir} onClick={onHeaderClick} align="right" />
            <ColHead col="renews" label="Renews" sortCol={sortCol} sortDir={sortDir} onClick={onHeaderClick} />
            <ColHead col="owner" label="Owner" sortCol={sortCol} sortDir={sortDir} onClick={onHeaderClick} />
          </tr>
        </thead>
        <tbody>
          {sorted.map((v) => {
            const owner = v.ownerId ? owners.get(v.ownerId) : undefined;
            const isSelected = selectedIds.has(v.id);
            return (
              <tr
                key={v.id}
                onClick={() => window.location.assign(`/app/vendors/${v.id}`)}
                style={{
                  cursor: "pointer",
                  background: isSelected ? "rgba(94,106,210,0.04)" : "transparent",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) (e.currentTarget as HTMLElement).style.background = "#f8fafc";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = isSelected
                    ? "rgba(94,106,210,0.04)"
                    : "transparent";
                }}
              >
                <td
                  style={{ ...TD_STYLE, width: 36 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(v.id)}
                    aria-label={`Select ${v.name}`}
                    style={{ cursor: "pointer" }}
                  />
                </td>
                <td style={TD_STYLE}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <VendorBrandLogo vendorId={v.id} name={v.name} size={24} />
                    <span style={{ fontWeight: 500 }}>{v.name}</span>
                  </div>
                </td>
                <td style={{ ...TD_STYLE, color: "#475569", textTransform: "capitalize" }}>
                  {v.category ?? "—"}
                </td>
                <td style={{ ...TD_STYLE, fontFamily: "var(--font-mono)" }}>
                  {v.tier ? `T${v.tier}` : "—"}
                </td>
                <td style={TD_STYLE}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "2px 8px",
                      background: postureBg(v.posture),
                      color: postureColor(v.posture),
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: postureColor(v.posture),
                      }}
                    />
                    {v.posture ?? "—"}
                  </span>
                </td>
                <td style={{ ...TD_STYLE, textAlign: "right", fontFamily: "var(--font-mono)" }}>
                  {v.contract?.annualSpendUsd ? fmtUsd(v.contract.annualSpendUsd) : "—"}
                </td>
                <td style={{ ...TD_STYLE, textAlign: "right", fontFamily: "var(--font-mono)" }}>
                  {v.contract?.seatCount?.toLocaleString() ?? "—"}
                </td>
                <td style={{ ...TD_STYLE, color: "#475569" }}>
                  {renewCell(v.contract?.renewsAt)}
                </td>
                <td style={{ ...TD_STYLE, color: "#475569" }}>
                  {owner?.name ?? v.ownerId ?? "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {vendors.length === 0 && (
        <div
          style={{
            padding: "48px 16px",
            textAlign: "center",
            color: "#64748b",
            fontSize: 14,
          }}
        >
          No vendors match the current filters.
        </div>
      )}
    </div>
  );
}

function renewCell(iso: string | undefined): string {
  const days = daysUntil(iso);
  if (!iso || days === null) return "—";
  try {
    const d = new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return `${d} (${days >= 0 ? `${days}d` : `${Math.abs(days)}d ago`})`;
  } catch {
    return iso;
  }
}

interface ColHeadProps {
  col: Col;
  label: string;
  sortCol: Col;
  sortDir: "asc" | "desc";
  onClick: (c: Col) => void;
  align?: "left" | "right";
}

function ColHead({ col, label, sortCol, sortDir, onClick, align = "left" }: ColHeadProps): JSX.Element {
  const active = sortCol === col;
  return (
    <th
      scope="col"
      onClick={() => onClick(col)}
      style={{ ...TH_STYLE, textAlign: align }}
      aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          justifyContent: align === "right" ? "flex-end" : "flex-start",
          width: "100%",
          color: active ? "#0f172a" : "inherit",
        }}
      >
        {label}
        {active &&
          (sortDir === "asc" ? (
            <ChevronUp size={12} aria-hidden="true" />
          ) : (
            <ChevronDown size={12} aria-hidden="true" />
          ))}
      </span>
    </th>
  );
}
