import type { Vendor } from "@unsyphn/shared";
import { VendorBrandLogo } from "./VendorBrandLogo.js";
import { daysUntil, fmtUsd, postureColor, postureBg } from "./types.js";
import type { TeamMember } from "../../lib/api.js";

interface Props {
  vendor: Vendor;
  owner: TeamMember | undefined;
  selected: boolean;
  onToggleSelect: (id: string) => void;
}

function tierLabel(t: 1 | 2 | 3 | undefined): string {
  return t ? `T${t}` : "—";
}

function renewSummary(iso: string | undefined): string {
  const days = daysUntil(iso);
  if (days === null) return "Renews —";
  if (days < 0) return `Renewed ${Math.abs(days)}d ago`;
  if (days === 0) return "Renews today";
  if (days < 60) return `Renews in ${days}d`;
  if (days < 365) return `Renews in ${Math.round(days / 30)}mo`;
  return `Renews in ${Math.round(days / 30)}mo`;
}

const OWNER_PALETTE = [
  "#5E6AD2", "#0ea5e9", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6",
];

function ownerColor(id: string | undefined): string {
  if (!id) return "#64748b";
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return OWNER_PALETTE[h % OWNER_PALETTE.length] ?? "#5E6AD2";
}

export function PortfolioVendorCard({
  vendor,
  owner,
  selected,
  onToggleSelect,
}: Props): JSX.Element {
  const handleOpen = () => {
    window.location.assign(`/app/vendors/${vendor.id}`);
  };
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      if (e.target instanceof HTMLInputElement) return;
      e.preventDefault();
      handleOpen();
    }
  };

  const onCheckboxClick = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
  };

  const initial = owner?.avatarLetter ?? owner?.name?.[0] ?? "?";
  const oc = ownerColor(vendor.ownerId);

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`${vendor.name} — open detail`}
      aria-pressed={selected}
      onClick={handleOpen}
      onKeyDown={handleKey}
      style={{
        position: "relative",
        ...(selected
          ? {
              border: "1px solid #5E6AD2",
              boxShadow:
                "0 0 0 3px rgba(94,106,210,0.15), 0 6px 20px rgba(15,23,42,0.06)",
            }
          : {}),
        borderRadius: 16,
        padding: 20,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
      className={`portfolio-card glass-strong lift-on-hover${selected ? " is-selected" : ""}`}
    >
      {/* Checkbox top-right, visible on hover (CSS handles), always visible when selected */}
      <label
        className="portfolio-card-check"
        onClick={onCheckboxClick}
        onKeyDown={onCheckboxClick}
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 22,
          height: 22,
          borderRadius: 6,
          background: selected ? "#5E6AD2" : "#ffffff",
          border: selected
            ? "1px solid #5E6AD2"
            : "1px solid rgba(15,23,42,0.18)",
          cursor: "pointer",
          opacity: selected ? 1 : 0,
          transition: "opacity 120ms ease",
        }}
        aria-label={`Select ${vendor.name}`}
      >
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(vendor.id)}
          onClick={onCheckboxClick}
          style={{
            position: "absolute",
            opacity: 0,
            width: "100%",
            height: "100%",
            margin: 0,
            cursor: "pointer",
          }}
        />
        {selected && (
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
            <path
              d="M2.5 6.3l2.4 2.4 4.6-5"
              stroke="#fff"
              strokeWidth="1.8"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </label>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <VendorBrandLogo vendorId={vendor.id} name={vendor.name} size={32} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <h3
            style={{
              margin: 0,
              fontFamily: "var(--font-display)",
              fontSize: 15,
              fontWeight: 600,
              color: "#0f172a",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {vendor.name}
          </h3>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
            {vendor.category ?? "—"}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "2px 8px",
            background: postureBg(vendor.posture),
            color: postureColor(vendor.posture),
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
              background: postureColor(vendor.posture),
            }}
          />
          {vendor.posture ?? "—"}
        </span>
        <span
          style={{
            padding: "2px 8px",
            background: "rgba(15,23,42,0.05)",
            color: "#475569",
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 600,
            fontFamily: "var(--font-mono)",
          }}
        >
          {tierLabel(vendor.tier)}
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 8,
          paddingTop: 8,
          borderTop: "1px solid rgba(15,23,42,0.06)",
        }}
      >
        <Stat
          label="Spend"
          value={
            vendor.contract?.annualSpendUsd
              ? fmtUsd(vendor.contract.annualSpendUsd)
              : "—"
          }
        />
        <Stat
          label="Seats"
          value={vendor.contract?.seatCount?.toLocaleString() ?? "—"}
        />
        <Stat label="Renews" value={renewSummary(vendor.contract?.renewsAt)} />
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 6,
        }}
      >
        <span
          aria-hidden="true"
          title={owner?.name ?? vendor.ownerId}
          style={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            background: oc,
            color: "#fff",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          {initial}
        </span>
      </div>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div style={{ minWidth: 0 }}>
      <div
        style={{
          fontSize: 10,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "#94a3b8",
          fontWeight: 600,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 13,
          color: "#0f172a",
          fontFamily: "var(--font-mono)",
          fontWeight: 500,
          marginTop: 2,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </div>
    </div>
  );
}
