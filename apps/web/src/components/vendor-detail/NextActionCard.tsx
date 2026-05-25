import { Zap } from "lucide-react";
import type { Vendor } from "@unsyphn/shared";
import { daysUntil, fmtUsd, hashSeed } from "./utils.js";

export type TabId = "overview" | "spend" | "contracts" | "changes" | "risk" | "activity";

interface Props {
  vendor: Vendor;
  changeCount: number;
  onTab: (t: TabId) => void;
}

export function NextActionCard({ vendor, changeCount, onTab }: Props): JSX.Element {
  const days = daysUntil(vendor.contract?.renewsAt ?? vendor.renewalDate);
  const seatCount = vendor.contract?.seatCount ?? 0;
  const annualSpend = vendor.contract?.annualSpendUsd ?? 0;

  const rand = hashSeed(vendor.id);
  const utilizationPct = 40 + Math.floor(rand() * 56);
  const activeSeats = Math.round((seatCount * utilizationPct) / 100);
  const unused = Math.max(0, seatCount - activeSeats);
  const perSeat = seatCount > 0 ? Math.round(annualSpend / seatCount) : 0;
  const recoverable = unused * perSeat;

  const cta =
    changeCount > 0
      ? { badge: "Changes", label: `Acknowledge ${changeCount} change${changeCount !== 1 ? "s" : ""}`, tab: "changes" as TabId | null }
      : days !== null && days <= 60
        ? { badge: "Renewal", label: `Renewal in ${days}d — start packet`, tab: "contracts" as TabId | null }
        : unused > 5
          ? { badge: "Savings", label: `Reclaim ${unused} unused seats (${fmtUsd(recoverable)}/yr)`, tab: "spend" as TabId | null }
          : { badge: "Monitor", label: "View inbox filtered to vendor", tab: null };

  return (
    <div className="card" style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-3)", minWidth: 200, maxWidth: 240 }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
        <Zap size={14} aria-hidden="true" style={{ color: "var(--warning)", flexShrink: 0 }} />
        <span style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Next action
        </span>
      </div>
      <span className="badge badge-accent" style={{ alignSelf: "flex-start" }}>{cta.badge}</span>
      <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-2)", lineHeight: 1.5 }}>{cta.label}</p>
      <button
        type="button"
        className="btn btn-primary"
        style={{ alignSelf: "flex-start" }}
        onClick={() => (cta.tab ? onTab(cta.tab) : window.location.assign(`/app/inbox?vendorId=${vendor.id}`))}
      >
        Take action
      </button>
    </div>
  );
}
