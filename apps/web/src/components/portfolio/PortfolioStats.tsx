import type { Vendor } from "@unsyphn/shared";
import { fmtUsd } from "./types.js";

interface Props {
  vendors: ReadonlyArray<Vendor>;
}

function vendorsRenewingIn(vendors: ReadonlyArray<Vendor>, days: number): number {
  const cutoff = Date.now() + days * 86_400_000;
  let count = 0;
  for (const v of vendors) {
    if (!v.contract?.renewsAt) continue;
    const t = Date.parse(v.contract.renewsAt);
    if (Number.isFinite(t) && t >= Date.now() && t <= cutoff) count++;
  }
  return count;
}

export function PortfolioStats({ vendors }: Props): JSX.Element {
  const total = vendors.length;
  const runRate = vendors.reduce((s, v) => s + (v.contract?.annualSpendUsd ?? 0), 0);
  const renewingSoon = vendorsRenewingIn(vendors, 90);
  const highRisk = vendors.filter((v) => v.posture === "risk").length;

  const stats: ReadonlyArray<{ value: string; label: string; tone?: "danger" | "warning" }> = [
    { value: String(total), label: "Vendors" },
    { value: fmtUsd(runRate), label: "Annual run-rate" },
    { value: String(renewingSoon), label: "Renewing in 90 days", tone: renewingSoon > 0 ? "warning" : undefined },
    { value: String(highRisk), label: "High-risk", tone: highRisk > 0 ? "danger" : undefined },
  ];

  return (
    <div
      role="region"
      aria-label="Portfolio summary"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 16,
      }}
    >
      {stats.map((s) => (
        <div
          key={s.label}
          style={{
            background: "#ffffff",
            border: "1px solid rgba(15,23,42,0.08)",
            borderRadius: 12,
            padding: "16px 18px",
            boxShadow: "0 4px 14px rgba(15,23,42,0.04)",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 28,
              fontWeight: 300,
              color:
                s.tone === "danger"
                  ? "#dc2626"
                  : s.tone === "warning"
                    ? "#d97706"
                    : "#0f172a",
              lineHeight: 1.1,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {s.value}
          </div>
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "#64748b",
              fontWeight: 600,
              marginTop: 6,
            }}
          >
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}
