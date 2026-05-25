import { VendorLogo } from "./VendorLogo.js";

export type Posture = "fresh" | "expiring" | "stale" | "risk" | "watch" | "ok";

export interface VendorCardData {
  id: string;
  name: string;
  domain: string;
  tier: 1 | 2 | 3;
  posture: Posture;
  renewsAt: string;
  ownerInitial: string;
  ownerEmail: string;
}

function postureLabel(p: Posture): string {
  if (p === "fresh" || p === "ok") return "fresh";
  if (p === "expiring" || p === "watch") return "expiring";
  return "stale";
}

function postureBadgeClass(p: Posture): string {
  if (p === "fresh" || p === "ok") return "badge badge-success";
  if (p === "expiring" || p === "watch") return "badge badge-warning";
  return "badge badge-danger";
}

function daysUntil(dateStr: string): number {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  return Math.round((then - now) / 86_400_000);
}

function formatRenewal(dateStr: string): string {
  const d = new Date(dateStr);
  const formatted = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const days = daysUntil(dateStr);
  const suffix = days > 0 ? ` (in ${days}d)` : ` (${Math.abs(days)}d ago)`;
  return `Renews ${formatted}${suffix}`;
}

function tierLabel(tier: number): string {
  if (tier === 1) return "Tier 1";
  if (tier === 2) return "Tier 2";
  return "Tier 3";
}

interface VendorCardProps {
  vendor: VendorCardData;
}

export function VendorCard({ vendor }: VendorCardProps): JSX.Element {
  const handleClick = () => {
    window.location.assign(`/app/vendor/${vendor.id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <article
      className="card"
      role="button"
      tabIndex={0}
      aria-label={`${vendor.name} vendor details`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      style={{
        padding: "var(--space-4)",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
      }}
    >
      {/* Top row: logo + name + tier badge */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
        <VendorLogo name={vendor.name} domain={vendor.domain} size={48} />
        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "space-between", gap: "var(--space-2)", minWidth: 0 }}>
          <h3
            className="h3"
            style={{ fontSize: "var(--text-base)", fontWeight: 500, color: "var(--text-strong)", margin: 0 }}
          >
            {vendor.name}
          </h3>
          <span className="badge badge-neutral">{tierLabel(vendor.tier)}</span>
        </div>
      </div>

      {/* Domain */}
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "var(--text-xs)",
          color: "var(--muted)",
          display: "block",
        }}
      >
        {vendor.domain}
      </span>

      {/* Posture chip */}
      <span className={postureBadgeClass(vendor.posture)}>
        {postureLabel(vendor.posture)}
      </span>

      {/* Renewal date */}
      <span
        style={{
          fontSize: "var(--text-sm)",
          color: "var(--text-2)",
          display: "block",
        }}
      >
        {formatRenewal(vendor.renewsAt)}
      </span>

      {/* Owner */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginTop: "var(--space-1)" }}>
        <span
          aria-hidden="true"
          style={{
            width: 24,
            height: 24,
            borderRadius: "var(--radius-full)",
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "var(--text-xs)",
            fontWeight: 500,
            color: "var(--text-2)",
            flexShrink: 0,
          }}
        >
          {vendor.ownerInitial}
        </span>
        <span
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--muted)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {vendor.ownerEmail}
        </span>
      </div>
    </article>
  );
}
